import "server-only";

import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, isNull, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { favorites, sessions, users } from "../db/schema";
import { toUser } from "../db/queries/mappers";
import type { User } from "../types";
import { SESSION_COOKIE } from "./cookie";
import { generateToken, hashToken } from "./token";

export { SESSION_COOKIE, hashToken };

/** Web (cookie) oturum ömrü — tarayıcıda kısa tutulur. */
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 gün
/**
 * Mobil (Bearer) oturum ömrü. Kullanıcı uygulamaya her gün yeniden giriş yapmaz;
 * bunun yerine token kayan süreyle uzar ve gerektiğinde DB'den silinerek anında
 * iptal edilir (opak token olmasının avantajı — JWT'de bu mümkün değildi).
 */
const MOBILE_MAX_AGE_MS = 60 * 24 * 60 * 60 * 1000; // 60 gün
/**
 * Kayan uzatma sıklığı. Her istekte yazmak, pooler üzerinde oturum başına
 * serileşen bir hotspot yaratırdı; günde bir yazma yeterli.
 */
const TOUCH_INTERVAL_MS = 24 * 60 * 60 * 1000;

interface IssueOptions {
  client: "web" | "mobile";
  deviceName?: string;
  ttlMs: number;
}

/** Yeni oturum satırı yazar; ham token'ı döner (DB'de yalnızca hash'i durur). */
async function issueSession(
  userId: string,
  { client, deviceName, ttlMs }: IssueOptions,
): Promise<{ token: string; expiresAt: Date }> {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + ttlMs);
  await db.insert(sessions).values({
    userId,
    tokenHash: hashToken(token),
    client,
    deviceName: deviceName ?? null,
    expiresAt,
  });

  // Süresi geçmiş satırları fırsat buldukça temizle (tablo aksi halde sonsuza dek büyür).
  void db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .catch(() => {});

  return { token, expiresAt };
}

/** Web oturumu: ham token cookie'ye yazılır. */
export async function createSession(userId: string): Promise<void> {
  const { token, expiresAt } = await issueSession(userId, { client: "web", ttlMs: MAX_AGE_MS });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Mobil oturumu: cookie yok, ham token yanıt gövdesinde istemciye verilir. */
export async function createMobileSession(
  userId: string,
  deviceName?: string,
): Promise<{ token: string; expiresAt: Date }> {
  return issueSession(userId, { client: "mobile", deviceName, ttlMs: MOBILE_MAX_AGE_MS });
}

export interface SessionContext {
  user: User | null;
  favoriteIds: string[];
  /** Aktif oturumun token hash'i — şifre değiştirmede "bu cihazı atma" için. */
  tokenHash: string | null;
}

/** Authorization: Bearer <token> başlığını okur (yoksa null). */
async function bearerToken(): Promise<string | null> {
  const h = await headers();
  const raw = h.get("authorization");
  const match = raw?.match(/^Bearer\s+(\S+)$/i);
  return match ? match[1] : null;
}

/**
 * Oturum kullanıcısı + favori ilan id'leri — TEK sorguda.
 * RootLayout her istekte bunu çağırdığı için iki ayrı seri sorgu tüm sayfalara
 * gecikme ekliyordu; sessions ⋈ users ⟕ favorites tek round-trip ile çözülür.
 *
 * Token önce Authorization başlığından, yoksa cookie'den okunur. Böylece aynı
 * kod hem web sayfalarını hem /api/v1'i besler.
 *
 * Request kapsamında memoize (route handler'da da geçerlidir).
 */
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  const empty: SessionContext = { user: null, favoriteIds: [], tokenHash: null };

  const token = (await bearerToken()) ?? (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return empty;

  const tokenHash = hashToken(token);
  const rows = await db
    .select({
      user: users,
      sessionId: sessions.id,
      client: sessions.client,
      lastUsedAt: sessions.lastUsedAt,
      favoriteIds: sql<
        string[]
      >`coalesce(array_agg(${favorites.listingId}) filter (where ${favorites.listingId} is not null), '{}')`,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(favorites, eq(favorites.userId, users.id))
    .where(
      and(
        eq(sessions.tokenHash, tokenHash),
        gt(sessions.expiresAt, new Date()),
        // Anonimleştirilmiş hesap oturum açamaz.
        isNull(users.deletedAt),
      ),
    )
    // users.id'ye ek olarak sessions.id de gruba girmeli (select'te session sütunları var).
    .groupBy(users.id, sessions.id)
    .limit(1);

  if (!rows.length) return empty;
  const row = rows[0];

  // Kayan uzatma — yalnız mobil oturumlarda ve günde en çok bir kez.
  if (row.client === "mobile" && Date.now() - row.lastUsedAt.getTime() > TOUCH_INTERVAL_MS) {
    const now = new Date();
    await db
      .update(sessions)
      .set({ lastUsedAt: now, expiresAt: new Date(now.getTime() + MOBILE_MAX_AGE_MS) })
      .where(eq(sessions.id, row.sessionId));
  }

  return { user: toUser(row.user), favoriteIds: row.favoriteIds ?? [], tokenHash };
});

/** Geçerli oturum kullanıcısı (yoksa null). Request kapsamında memoize. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { user } = await getSessionContext();
  return user;
});

/**
 * Oturum zorunlu — yoksa /giris'e yönlendirir.
 * YALNIZCA web (server action / sayfa) için. REST uçları bunun yerine
 * requireApiUser() kullanır; redirect bir API'de 307 HTML üretirdi.
 */
export async function verifySession(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  return user;
}

/** Web oturumunu sonlandırır (DB satırı + cookie). */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
    jar.delete(SESSION_COOKIE);
  }
}

/** Bearer oturumunu sonlandırır (cookie'ye dokunmaz). */
export async function destroyBearerSession(token: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}
