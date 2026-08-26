"use server";

import { verifySession } from "../auth/session";
import * as core from "../core/conversations";
import { applyRevalidation } from "./wrap";
import type { Message } from "../types";

// İş mantığı src/lib/core/conversations.ts içinde.

/** İlan detayından mesaj başlat (varsa devam ettir). conversationId döner. */
export async function startConversationAction(
  listingId: string,
  text: string,
): Promise<{ conversationId?: string; error?: string }> {
  const user = await verifySession();
  const res = await core.startConversation(user, listingId, text);
  if (!res.ok) return { error: res.error.message };
  applyRevalidation(res.revalidate);
  return { conversationId: res.value.conversationId };
}

/** Mevcut sohbete mesaj ekle (yalnızca katılımcı). Eklenen mesajı döner. */
export async function sendMessageAction(
  conversationId: string,
  text: string,
): Promise<{ message?: Message; error?: string }> {
  const user = await verifySession();
  const res = await core.sendMessage(user, conversationId, text);
  if (!res.ok) return { error: res.error.message };
  applyRevalidation(res.revalidate);
  return { message: res.value.message };
}

/** Sohbeti okundu işaretler (rozet sayacı için). */
export async function markConversationReadAction(
  conversationId: string,
): Promise<{ error?: string }> {
  const user = await verifySession();
  const res = await core.markConversationRead(user, conversationId);
  if (!res.ok) return { error: res.error.message };
  applyRevalidation(res.revalidate);
  return {};
}
