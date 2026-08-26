"use server";

import { verifySession } from "../auth/session";
import * as core from "../core/requests";
import { applyRevalidation } from "./wrap";
import type { RequestStatus } from "../types";
import type { CreateRentalRequestInput } from "../core/schemas";

// İş mantığı src/lib/core/requests.ts içinde.

// UYARI: "use server" dosyalari YALNIZCA async fonksiyon export edebilir.
// Tip re-export'u (`export type { X }`) burada calisma aninda
// "ReferenceError: X is not defined" veriyor: derleyici modulu donusturuken
// tip-only isaretini kaybedip tanimsiz bir runtime bagi birakiyor. tsc ve
// `next build` bunu YAKALAMAZ; hata yalnizca action cagrildiginda ortaya cikar.
// Tipler kendi kaynak modullerinden import edilmeli.

export async function createRentalRequestAction(
  input: CreateRentalRequestInput,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await verifySession();
  const res = await core.createRentalRequest(user, input);
  if (!res.ok) return { error: res.error.message };
  applyRevalidation(res.revalidate);
  return { ok: true };
}

/** Talep durumu güncelle: owner onaylar/reddeder, renter iptal eder. */
export async function updateRequestStatusAction(
  requestId: string,
  status: RequestStatus,
): Promise<{ error?: string }> {
  const user = await verifySession();
  const res = await core.updateRequestStatus(user, requestId, status);
  if (!res.ok) return { error: res.error.message };
  applyRevalidation(res.revalidate);
  return {};
}
