"use server";

import { verifySession } from "../auth/session";
import * as core from "../core/listings";
import { applyEffects } from "./wrap";
import type { ListingStatus } from "../types";
import type { CreateListingInput, UpdateListingInput } from "../core/schemas";

// İş mantığı src/lib/core/listings.ts içinde; buradaki fonksiyonlar yalnızca web
// için ince sarmalayıcılardır (oturum + revalidate + eski `{ error }` sözleşmesi).
// Aynı core'u /api/v1 route handler'ları kendi HTTP statüleriyle çağırır.

// UYARI: "use server" dosyalari YALNIZCA async fonksiyon export edebilir.
// Tip re-export'u (`export type { X }`) burada calisma aninda
// "ReferenceError: X is not defined" veriyor: derleyici modulu donusturuken
// tip-only isaretini kaybedip tanimsiz bir runtime bagi birakiyor. tsc ve
// `next build` bunu YAKALAMAZ; hata yalnizca action cagrildiginda ortaya cikar.
// Tipler kendi kaynak modullerinden import edilmeli.

export async function createListingAction(
  input: CreateListingInput,
): Promise<{ id?: string; error?: string }> {
  const user = await verifySession();
  const res = await core.createListing(user, input);
  if (!res.ok) return { error: res.error.message };
  applyEffects(res);
  return { id: res.value.id };
}

export async function updateListingAction(
  listingId: string,
  input: UpdateListingInput,
): Promise<{ error?: string }> {
  const user = await verifySession();
  const res = await core.updateListing(user, listingId, input);
  if (!res.ok) return { error: res.error.message };
  applyEffects(res);
  return {};
}

export async function updateListingStatusAction(
  listingId: string,
  status: ListingStatus,
): Promise<{ error?: string }> {
  const user = await verifySession();
  const res = await core.updateListingStatus(user, listingId, status);
  if (!res.ok) return { error: res.error.message };
  applyEffects(res);
  return {};
}

export async function deleteListingAction(listingId: string): Promise<{ error?: string }> {
  const user = await verifySession();
  const res = await core.deleteListing(user, listingId);
  if (!res.ok) return { error: res.error.message };
  applyEffects(res);
  return {};
}
