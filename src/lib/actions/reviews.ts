"use server";

import { verifySession } from "../auth/session";
import * as core from "../core/reviews";
import { applyEffects } from "./wrap";
import type { CreateReviewInput } from "../core/schemas";

// İş mantığı src/lib/core/reviews.ts içinde.

// UYARI: "use server" dosyalari YALNIZCA async fonksiyon export edebilir.
// Tip re-export'u (`export type { X }`) burada calisma aninda
// "ReferenceError: X is not defined" veriyor: derleyici modulu donusturuken
// tip-only isaretini kaybedip tanimsiz bir runtime bagi birakiyor. tsc ve
// `next build` bunu YAKALAMAZ; hata yalnizca action cagrildiginda ortaya cikar.
// Tipler kendi kaynak modullerinden import edilmeli.

/** Onaylanmış kiralamanın kiralayanı, ilan sahibine yorum bırakır. */
export async function createReviewAction(
  input: CreateReviewInput,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await verifySession();
  const res = await core.createReview(user, input);
  if (!res.ok) return { error: res.error.message };
  applyEffects(res);
  return { ok: true };
}
