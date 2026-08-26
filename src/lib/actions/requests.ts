"use server";

import { verifySession } from "../auth/session";
import * as core from "../core/requests";
import { applyRevalidation } from "./wrap";
import type { RequestStatus } from "../types";
import type { CreateRentalRequestInput } from "../core/schemas";

// İş mantığı src/lib/core/requests.ts içinde.

export type { CreateRentalRequestInput };

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
