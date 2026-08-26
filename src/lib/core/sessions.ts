import "server-only";

import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "../db";
import { conversations, messages, rentalRequests, sessions } from "../db/schema";
import type { User } from "../types";
import { fail, mutated, type MutationResult } from "./errors";

/** "Cihazlarım" ekranı için oturum özeti. tokenHash ASLA dışarı verilmez. */
export interface SessionView {
  id: string;
  client: "web" | "mobile";
  deviceName: string | null;
  lastUsedAt: string;
  createdAt: string;
  expiresAt: string;
  /** İsteği yapan oturumun kendisi mi. */
  current: boolean;
}

export async function listSessions(user: User, currentTokenHash: string): Promise<SessionView[]> {
  const rows = await db
    .select()
    .from(sessions)
    .where(and(eq(sessions.userId, user.id), gt(sessions.expiresAt, new Date())))
    .orderBy(sql`${sessions.lastUsedAt} desc`);

  return rows.map((r) => ({
    id: r.id,
    client: r.client,
    deviceName: r.deviceName,
    lastUsedAt: r.lastUsedAt.toISOString(),
    createdAt: r.createdAt.toISOString(),
    expiresAt: r.expiresAt.toISOString(),
    current: r.tokenHash === currentTokenHash,
  }));
}

/** Uzaktan oturum kapatma — yalnızca kendi oturumlarını. */
export async function revokeSession(
  user: User,
  sessionId: string,
): Promise<MutationResult<{ id: string }>> {
  const deleted = await db
    .delete(sessions)
    .where(and(eq(sessions.id, sessionId), eq(sessions.userId, user.id)))
    .returning({ id: sessions.id });
  if (!deleted.length) return fail("not_found", "Oturum bulunamadı.");
  return mutated({ id: sessionId });
}

export interface Badges {
  pendingIncomingRequests: number;
  unreadConversations: number;
}

/**
 * Rozet sayaçları — mobil bunları polling'ler (push gönderimi henüz yok).
 * İki sayı tek round-trip'te: mobilde her ekstra gidiş-dönüş pahalı.
 *
 * "Okunmamış": karşı taraftan gelen ve benim son okuma damgamdan sonra yazılmış
 * en az bir mesajı olan sohbet. Damga hiç yoksa (hiç açılmamış) tüm karşı taraf
 * mesajları okunmamış sayılır.
 */
export async function getBadges(user: User): Promise<Badges> {
  const [row] = await db.execute<{ pending: number; unread: number }>(sql`
    select
      (select count(*)::int from ${rentalRequests}
         where owner_id = ${user.id} and status = 'beklemede') as pending,
      (select count(*)::int from ${conversations} c
         where (c.renter_id = ${user.id} or c.owner_id = ${user.id})
           and exists (
             select 1 from ${messages} m
             where m.conversation_id = c.id
               and m.sender_id <> ${user.id}
               and m.created_at > coalesce(
                 case when c.renter_id = ${user.id} then c.renter_last_read_at
                      else c.owner_last_read_at end,
                 'epoch'::timestamptz)
           )) as unread
  `);

  return {
    pendingIncomingRequests: row?.pending ?? 0,
    unreadConversations: row?.unread ?? 0,
  };
}
