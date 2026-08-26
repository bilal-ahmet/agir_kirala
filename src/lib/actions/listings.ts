"use server";

import { verifySession } from "../auth/session";
import * as core from "../core/listings";
import { applyRevalidation } from "./wrap";
import type { ListingStatus } from "../types";
import type { CreateListingInput, UpdateListingInput } from "../core/schemas";

// İş mantığı src/lib/core/listings.ts içinde; buradaki fonksiyonlar yalnızca web
// için ince sarmalayıcılardır (oturum + revalidate + eski `{ error }` sözleşmesi).
// Aynı core'u /api/v1 route handler'ları kendi HTTP statüleriyle çağırır.

export type { CreateListingInput, UpdateListingInput };

export async function createListingAction(
  input: CreateListingInput,
): Promise<{ id?: string; error?: string }> {
  const user = await verifySession();
  const res = await core.createListing(user, input);
  if (!res.ok) return { error: res.error.message };
  applyRevalidation(res.revalidate);
  return { id: res.value.id };
}

export async function updateListingAction(
  listingId: string,
  input: UpdateListingInput,
): Promise<{ error?: string }> {
  const user = await verifySession();
  const res = await core.updateListing(user, listingId, input);
  if (!res.ok) return { error: res.error.message };
  applyRevalidation(res.revalidate);
  return {};
}

export async function updateListingStatusAction(
  listingId: string,
  status: ListingStatus,
): Promise<{ error?: string }> {
  const user = await verifySession();
  const res = await core.updateListingStatus(user, listingId, status);
  if (!res.ok) return { error: res.error.message };
  applyRevalidation(res.revalidate);
  return {};
}

export async function deleteListingAction(listingId: string): Promise<{ error?: string }> {
  const user = await verifySession();
  const res = await core.deleteListing(user, listingId);
  if (!res.ok) return { error: res.error.message };
  applyRevalidation(res.revalidate);
  return {};
}
