import "server-only";

import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { and, eq, gt } from "drizzle-orm";
import { db } from "../db";
import { sessions, users } from "../db/schema";
import { toUser } from "../db/queries/mappers";
import type { User } from "../types";
import { SESSION_COOKIE } from "./cookie";

export { SESSION_COOKIE };
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000; // 30 gün

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Yeni oturum oluşturur: rastgele token → hash DB'ye, ham token cookie'ye. */
export async function createSession(userId: string): Promise<void> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAX_AGE_MS);
  await db.insert(sessions).values({ userId, tokenHash: hashToken(token), expiresAt });

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

/** Geçerli oturum kullanıcısı (yoksa null). Request kapsamında memoize. */
export const getCurrentUser = cache(async (): Promise<User | null> => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const rows = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(sessions.userId, users.id))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date())))
    .limit(1);

  return rows.length ? toUser(rows[0].user) : null;
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
