import "server-only";

import { eq } from "drizzle-orm";
import { db } from "../db";
import { rentalRequests, reviews } from "../db/schema";
import { recomputeUserRating } from "../db/queries/reviews";
import type { User } from "../types";
import { fail, mutated, type MutationResult } from "./errors";
import { createReviewSchema, type CreateReviewInput } from "./schemas";

/** Onaylanmış kiralamanın kiralayanı, ilan sahibine yorum bırakır. */
export async function createReview(
  user: User,
  input: CreateReviewInput,
): Promise<MutationResult<{ id: string }>> {
  const parsed = createReviewSchema.safeParse(input);
  if (!parsed.success) {
    return fail("validation", parsed.error.issues[0]?.message ?? "Yorum geçersiz.");
  }
  const d = parsed.data;

  const req = await db.query.rentalRequests.findFirst({
    where: eq(rentalRequests.id, d.rentalRequestId),
  });
  if (!req) return fail("not_found", "Kiralama bulunamadı.");
  if (req.renterId !== user.id) return fail("forbidden", "Bu kiralama için yorum yapamazsınız.");
  if (req.status !== "onaylandi") {
    return fail("validation", "Yalnızca onaylanmış kiralamalara yorum yapılabilir.");
  }

  // Aynı kiralamaya ikinci yorum engellenir.
  const existing = await db.query.reviews.findFirst({
    where: eq(reviews.rentalRequestId, d.rentalRequestId),
  });
  if (existing) return fail("already_exists", "Bu kiralama için zaten yorum yaptınız.");

  const [created] = await db
    .insert(reviews)
    .values({
      listingId: req.listingId,
      reviewerId: user.id,
      targetUserId: req.ownerId,
      rentalRequestId: req.id,
      rating: d.rating,
      comment: d.comment,
    })
    .returning({ id: reviews.id });

  await recomputeUserRating(req.ownerId);

  return mutated({ id: created.id }, ["/hesap/taleplerim", `/ilanlar/${req.listingId}`]);
}
