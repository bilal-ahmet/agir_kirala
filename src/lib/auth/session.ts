import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { db } from "../db";
import { favorites, sessions, users } from "../db/schema";
import { toUser } from "../db/queries/mappers";
import type { User } from "../types";
import { SESSION_COOKIE } from "./cookie";

export { SESSION_COOKIE };
const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 1 gün

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Yeni oturum oluşturur: rastgele token → hash DB'ye, ham token cookie'ye. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAX_AGE_MS);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });

  // Süresi geçmiş satırları fırsat buldukça temizle (tablo aksi halde sonsuza dek büyür).
  void db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .catch(() => {});

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export interface SessionContext {
  user: User | null;
  favoriteIds: string[];
}

/**
 * Oturum kullanıcısı + favori ilan id'leri — TEK sorguda.
 * RootLayout her istekte bunu çağırdığı için iki ayrı seri sorgu tüm sayfalara
 * gecikme ekliyordu; sessions ⋈ users ⟕ favorites tek round-trip ile çözülür.
 * Request kapsamında memoize.
 */
export const getSessionContext = cache(async (): Promise<SessionContext> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return { user: null, favoriteIds: [] };

  const rows = await db
    .select({
      user: users,
      favoriteIds: sql<
        string[]
      >`coalesce(array_agg(${favorites.listingId}) filter (where ${favorites.listingId} is not null), '{}')`,
    })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .leftJoin(favorites, eq(favorites.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .groupBy(users.id)
    .limit(1);

  if (!rows.length) return { user: null, favoriteIds: [] };
  return { user: toUser(rows[0].user), favoriteIds: rows[0].favoriteIds ?? [] };
});

/** Geçerli oturum kullanıcısı (yoksa null). Request kapsamında memoize. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const { user } = await getSessionContext();
  return user;
});

/** Oturum zorunlu — yoksa /giris'e yönlendirir. */
export async function verifySession(): Promise<User> {
  const user = await getCurrentUser();
  if (!user) redirect("/giris");
  return user;
}

/** Oturumu sonlandırır (DB satırı + cookie). */
export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) {
    await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
    jar.delete(SESSION_COOKIE);
  }
}
