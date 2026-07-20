"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { rentalRequests, reviews } from "../db/schema";
import { verifySession } from "../auth/session";
import { recomputeUserRating } from "../db/queries/reviews";

const schema = z.object({
  rentalRequestId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).default(""),
});

export type CreateReviewInput = z.input<typeof schema>;

/** Onaylanmış kiralamanın kiralayanı, ilan sahibine yorum bırakır. */
export async function createReviewAction(
  input: CreateReviewInput,
): Promise<{ ok?: boolean; error?: string }> {
  const user = await verifySession();
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Yorum geçersiz." };
  const d = parsed.data;

  const req = await db.query.rentalRequests.findFirst({
    where: eq(rentalRequests.id, d.rentalRequestId),
  });
  if (!req) return { error: "Kiralama bulunamadı." };
  if (req.renterId !== user.id) return { error: "Bu kiralama için yorum yapamazsınız." };
  if (req.status !== "onaylandi") return { error: "Yalnızca onaylanmış kiralamalara yorum yapılabilir." };

  // Aynı kiralamaya ikinci yorum engellenir.
  const existing = await db.query.reviews.findFirst({
    where: and(eq(reviews.rentalRequestId, d.rentalRequestId)),
  });
  if (existing) return { error: "Bu kiralama için zaten yorum yaptınız." };

  await db.insert(reviews).values({
    listingId: req.listingId,
    reviewerId: user.id,
    targetUserId: req.ownerId,
    rentalRequestId: req.id,
    rating: d.rating,
    comment: d.comment,
  });

  await recomputeUserRating(req.ownerId);

  revalidatePath("/hesap/taleplerim");
  revalidatePath(`/ilanlar/${req.listingId}`);
  return { ok: true };
}
