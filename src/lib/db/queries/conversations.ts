import "server-only";

import { and, asc, desc, eq, inArray, or, sql } from "drizzle-orm";
import { db } from "../index";
import { conversations, listings, messages, users } from "../schema";
import type { Conversation, Message } from "../../types";
import { toConversation, toMessage } from "./mappers";

/** Mesajlar sayfasında sohbet başına gösterilen en fazla mesaj sayısı. */
const MESSAGES_PER_CONVERSATION = 50;

export interface ConversationView {
  id: string;
  listingId: string;
  listingTitle: string;
  other: { id: string; name: string; accent?: string };
  messages: Message[];
}

/** Mesajlar sayfası için: sohbetler + karşı taraf bilgisi + ilan başlığı + mesajlar. */
export async function conversationViewsFor(userId: string): Promise<ConversationView[]> {
  const convRows = await db
    .select()
    .from(conversations)
    .where(or(eq(conversations.renterId, userId), eq(conversations.ownerId, userId)))
    .orderBy(desc(conversations.updatedAt));
  if (!convRows.length) return [];

  const convIds = convRows.map((c) => c.id);
  const listingIds = [...new Set(convRows.map((c) => c.listingId))];
  const otherIds = [
    ...new Set(convRows.map((c) => (c.renterId === userId ? c.ownerId : c.renterId))),
  ];

  // Sohbet başına yalnızca son MESSAGES_PER_CONVERSATION mesaj. Eskiden kullanıcının
  // tüm sohbetlerinin tüm mesajları limitsiz çekiliyordu.
  const ranked = db
    .select({
      id: messages.id,
      conversationId: messages.conversationId,
      senderId: messages.senderId,
      text: messages.text,
      createdAt: messages.createdAt,
      rn: sql<number>`row_number() over (partition by ${messages.conversationId} order by ${messages.createdAt} desc)`.as(
        "rn",
      ),
    })
    .from(messages)
    .where(inArray(messages.conversationId, convIds))
    .as("ranked");

  const [msgRows, listingRows, userRows] = await Promise.all([
    db
      .select()
      .from(ranked)
      .where(sql`${ranked.rn} <= ${MESSAGES_PER_CONVERSATION}`)
      .orderBy(asc(ranked.createdAt)),
    db.select({ id: listings.id, title: listings.title }).from(listings).where(inArray(listings.id, listingIds)),
    db.select({ id: users.id, name: users.name, accent: users.accent }).from(users).where(inArray(users.id, otherIds)),
  ]);

  const titleMap = new Map(listingRows.map((l) => [l.id, l.title]));
  const userMap = new Map(userRows.map((u) => [u.id, u]));

  return convRows.map((c) => {
    const otherId = c.renterId === userId ? c.ownerId : c.renterId;
    const o = userMap.get(otherId);
    return {
      id: c.id,
      listingId: c.listingId,
      listingTitle: titleMap.get(c.listingId) ?? "İlan",
      other: { id: otherId, name: o?.name ?? "Kullanıcı", accent: o?.accent ?? undefined },
      messages: msgRows.filter((m) => m.conversationId === c.id).map(toMessage),
    };
  });
}

/** Kullanıcının katıldığı tüm sohbetler (mesajlarıyla), en son güncellenen önce. */
export async function conversationsFor(userId: string): Promise<Conversation[]> {
  const convRows = await db
    .select()
    .from(conversations)
    .where(or(eq(conversations.renterId, userId), eq(conversations.ownerId, userId)))
    .orderBy(desc(conversations.updatedAt));

  if (!convRows.length) return [];

  const ids = convRows.map((c) => c.id);
  const msgRows = await db.query.messages.findMany({
    where: (m, { inArray }) => inArray(m.conversationId, ids),
    orderBy: asc(messages.createdAt),
  });

  return convRows.map((c) =>
    toConversation(
      c,
      msgRows.filter((m) => m.conversationId === c.id),
    ),
  );
}

/** Kullanıcının sohbet sayısı (sidebar rozeti). */
export async function conversationCount(userId: string): Promise<number> {
  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(conversations)
    .where(or(eq(conversations.renterId, userId), eq(conversations.ownerId, userId)));
  return n;
}

/** Tek sohbet — yalnızca katılımcı erişebilir. */
export async function getConversation(
  id: string,
  userId: string,
): Promise<Conversation | undefined> {
  const row = await db.query.conversations.findFirst({ where: eq(conversations.id, id) });
  if (!row || (row.renterId !== userId && row.ownerId !== userId)) return undefined;
  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, id))
    .orderBy(asc(messages.createdAt));
  return toConversation(row, msgRows);
}

/** Bir ilan için iki kullanıcı arasındaki sohbet (varsa). */
export async function findConversationByListing(
  listingId: string,
  renterId: string,
  ownerId: string,
): Promise<Conversation | undefined> {
  const row = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.listingId, listingId),
      eq(conversations.renterId, renterId),
      eq(conversations.ownerId, ownerId),
    ),
  });
  if (!row) return undefined;
  const msgRows = await db
    .select()
    .from(messages)
    .where(eq(messages.conversationId, row.id))
    .orderBy(asc(messages.createdAt));
  return toConversation(row, msgRows);
}
