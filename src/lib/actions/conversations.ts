"use server";

import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { conversations, listings, messages } from "../db/schema";
import { verifySession } from "../auth/session";
import type { Message } from "../types";

const textSchema = z.string().trim().min(1, "Mesaj boş olamaz.").max(4000);

interface MessageInsertRow {
  id: string;
  sender_id: string;
  text: string;
  created_at: string | Date;
  [key: string]: unknown;
}

/**
 * Mesajı yazar ve sohbetin updatedAt'ini günceller — TEK SQL turunda.
 * Yetki kontrolü INSERT'ün kaynak SELECT'ine gömülü olduğu için ayrı bir
 * "sohbeti getir + kontrol et" sorgusu gerekmez. Satır dönmezse yetki yok demektir.
 *
 * `touched` CTE'si dış sorguda okunur (`touched_n`); veri değiştiren CTE'ler
 * referans verilmese de çalışır ama böylece niyet açık ve doğrulanabilir olur.
 */
async function insertMessage(
  conversationId: string,
  senderId: string,
  text: string,
): Promise<Message | undefined> {
  const rows = await db.execute<MessageInsertRow>(sql`
    with authorized as (
      select id from ${conversations}
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
    select inserted.*, (select count(*)::int from touched) as touched_n
    from inserted
  `);

  const row = rows[0];
  if (!row) return undefined;
  return {
    id: row.id,
    senderId: row.sender_id,
    text: row.text,
    createdAt: new Date(row.created_at).toISOString(),
  };
}

/** İlan detayından mesaj başlat (varsa devam ettir). conversationId döner. */
export async function startConversationAction(
  listingId: string,
  text: string,
): Promise<{ conversationId?: string; error?: string }> {
  const user = await verifySession();
  const parsedText = textSchema.safeParse(text);
  if (!parsedText.success) return { error: parsedText.error.issues[0]?.message };

  const listing = await db.query.listings.findFirst({
    where: eq(listings.id, listingId),
    columns: { id: true, ownerId: true },
  });
  if (!listing) return { error: "İlan bulunamadı." };
  if (listing.ownerId === user.id) return { error: "Kendi ilanınıza mesaj gönderemezsiniz." };

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

  const message = await insertMessage(conv.id, user.id, parsedText.data);
  if (!message) return { error: "Mesaj gönderilemedi." };

  revalidatePath("/hesap/mesajlar");
  return { conversationId: conv.id };
}

/** Mevcut sohbete mesaj ekle (yalnızca katılımcı). Eklenen mesajı döner. */
export async function sendMessageAction(
  conversationId: string,
  text: string,
): Promise<{ message?: Message; error?: string }> {
  const user = await verifySession();
  const parsedText = textSchema.safeParse(text);
  if (!parsedText.success) return { error: parsedText.error.issues[0]?.message };

  const message = await insertMessage(conversationId, user.id, parsedText.data);
  if (!message) return { error: "Sohbet bulunamadı veya yetkiniz yok." };

  revalidatePath("/hesap/mesajlar");
  return { message };
}
