"use server";

import { verifySession } from "../auth/session";
import * as core from "../core/reviews";
import { applyRevalidation } from "./wrap";
import type { CreateReviewInput } from "../core/schemas";

// İş mantığı src/lib/core/reviews.ts içinde.

export type { CreateReviewInput };

/** Onaylanmış kiralamanın kiralayanı, ilan sahibine yorum bırakır. */
export async function createReviewAction(
  input: CreateReviewInput,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await verifySession();
  const res = await core.createReview(user, input);
  if (!res.ok) return { error: res.error.message };
  applyRevalidation(res.revalidate);
  return { ok: true };
}
