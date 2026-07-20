"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { conversations, listings, messages } from "../db/schema";
import { verifySession } from "../auth/session";

const textSchema = z.string().trim().min(1, "Mesaj boş olamaz.").max(4000);

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

  await db.insert(messages).values({
    conversationId: conv.id,
    senderId: user.id,
    text: parsedText.data,
  });
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conv.id));

  revalidatePath("/hesap/mesajlar");
  return { conversationId: conv.id };
}

/** Mevcut sohbete mesaj ekle (yalnızca katılımcı). */
export async function sendMessageAction(
  conversationId: string,
  text: string,
): Promise<{ error?: string }> {
  const user = await verifySession();
  const parsedText = textSchema.safeParse(text);
  if (!parsedText.success) return { error: parsedText.error.issues[0]?.message };

  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!conv || (conv.renterId !== user.id && conv.ownerId !== user.id)) {
    return { error: "Sohbet bulunamadı veya yetkiniz yok." };
  }

  await db.insert(messages).values({
    conversationId,
    senderId: user.id,
    text: parsedText.data,
  });
  await db.update(conversations).set({ updatedAt: new Date() }).where(eq(conversations.id, conversationId));

  revalidatePath("/hesap/mesajlar");
  return {};
}
