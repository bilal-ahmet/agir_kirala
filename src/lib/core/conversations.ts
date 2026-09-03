import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { conversations, listings, messages } from "../db/schema";
import type { Message, User } from "../types";
import { fail, mutated, type MutationResult } from "./errors";
import { messageTextSchema } from "./schemas";
import { preview, type Notification } from "../notify/types";

const REVALIDATE = ["/hesap/mesajlar"];

interface MessageInsertRow {
  id: string;
  sender_id: string;
  text: string;
  created_at: string | Date;
  /** Bildirim alıcısını belirlemek için sohbetin iki katılımcısı. */
  renter_id: string;
  owner_id: string;
  listing_id: string;
  [key: string]: unknown;
}

interface InsertedMessage {
  message: Message;
  /** Mesajı gönderen DIŞINDAKİ katılımcı — bildirim ona gider. */
  recipientId: string;
  listingId: string;
}

/**
 * Mesajı yazar ve sohbetin updatedAt'ini günceller — TEK SQL turunda.
 * Yetki kontrolü INSERT'ün kaynak SELECT'ine gömülü olduğu için ayrı bir
 * "sohbeti getir + kontrol et" sorgusu gerekmez. Satır dönmezse yetki yok demektir.
 */
async function insertMessage(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<InsertedMessage | undefined> {
  const rows = await db.execute<MessageInsertRow>(sql`
    with authorized as (
      select id, renter_id, owner_id, listing_id from ${conversations}
      where id = ${conversationId}
        and (renter_id = ${senderId} or owner_id = ${senderId})
    ),
    inserted as (
      insert into ${messages} (conversation_id, sender_id, text)
      select id, ${senderId}, ${text} from authorized
      returning id, sender_id, text, created_at
    ),
    touched as (
      update ${conversations} set updated_at = now()
      where id in (select id from authorized)
      returning id
    )
    select inserted.*, authorized.renter_id, authorized.owner_id, authorized.listing_id,
           (select count(*)::int from touched) as touched_n
    from inserted, authorized
  `);

  const row = rows[0];
  if (!row) return undefined;
  return {
    message: {
      id: row.id,
      senderId: row.sender_id,
      text: row.text,
      createdAt: new Date(row.created_at).toISOString(),
    },
    // Gönderen kendine bildirim almamalı.
    recipientId: row.renter_id === senderId ? row.owner_id : row.renter_id,
    listingId: row.listing_id,
  };
}

/** Yeni mesaj bildirimi. Başlık gönderenin adı — bildirim listesinde tanınır. */
function messageNotification(
  sender: User,
  inserted: InsertedMessage,
  conversationId: string,
): Notification {
  return {
    userId: inserted.recipientId,
    title: sender.name,
    body: preview(inserted.message.text),
    data: { type: "message", id: conversationId, listingId: inserted.listingId },
  };
}

/** İlan detayından mesaj başlat (varsa devam ettir). */
export async function startConversation(
  user: User,
  listingId: string,
  text: string,
): Promise<MutationResult<{ conversationId: string; message: Message }>> {
  const parsedText = messageTextSchema.safeParse(text);
  if (!parsedText.success) {
    return fail("validation", parsedText.error.issues[0]?.message ?? "Mesaj geçersiz.");
  }

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
    columns: { id: true, ownerId: true },
  });
  if (!listing) return fail("not_found", "İlan bulunamadı.");
  if (listing.ownerId === user.id) {
    return fail("self_action", "Kendi ilanınıza mesaj gönderemezsiniz.");
  }

  // Aynı ilan + (renter, owner) için mevcut sohbeti bul.
  let conv = await db.query.conversations.findFirst({
    where: and(
      eq(conversations.listingId, listingId),
      eq(conversations.renterId, user.id),
      eq(conversations.ownerId, listing.ownerId),
    ),
  });

  if (!conv) {
    [conv] = await db
      .insert(conversations)
      .values({ listingId, renterId: user.id, ownerId: listing.ownerId })
      .returning();
  }

  const inserted = await insertMessage(conv.id, user.id, parsedText.data);
  if (!inserted) return fail("internal", "Mesaj gönderilemedi.");

  return mutated({ conversationId: conv.id, message: inserted.message }, REVALIDATE, [
    messageNotification(user, inserted, conv.id),
  ]);
}

/** Mevcut sohbete mesaj ekle (yalnızca katılımcı). */
export async function sendMessage(
  user: User,
  conversationId: string,
  text: string,
): Promise<MutationResult<{ message: Message }>> {
  const parsedText = messageTextSchema.safeParse(text);
  if (!parsedText.success) {
    return fail("validation", parsedText.error.issues[0]?.message ?? "Mesaj geçersiz.");
  }

  const inserted = await insertMessage(conversationId, user.id, parsedText.data);
  if (!inserted) return fail("not_found", "Sohbet bulunamadı veya yetkiniz yok.");

  return mutated({ message: inserted.message }, REVALIDATE, [
    messageNotification(user, inserted, conversationId),
  ]);
}

/**
 * Sohbeti okundu işaretler — çağıran taraf hangi rolse (renter/owner) o sütun
 * güncellenir. İstemci kontrolünde tutulur ki GET yan etkisiz kalsın.
 */
export async function markConversationRead(
  user: User,
  conversationId: string,
): Promise<MutationResult<{ readAt: string }>> {
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
    columns: { id: true, renterId: true, ownerId: true },
  });
  if (!conv || (conv.renterId !== user.id && conv.ownerId !== user.id)) {
    return fail("not_found", "Sohbet bulunamadı veya yetkiniz yok.");
  }

  const now = new Date();
  await db
    .update(conversations)
    .set(conv.renterId === user.id ? { renterLastReadAt: now } : { ownerLastReadAt: now })
    .where(eq(conversations.id, conversationId));

  return mutated({ readAt: now.toISOString() }, REVALIDATE);
}
