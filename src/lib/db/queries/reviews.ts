import "server-only";

import { desc, eq, sql } from "drizzle-orm";
import { db } from "../index";
import { reviews, users } from "../schema";

export interface ReviewView {
  id: string;
  listingId: string;
  reviewerId: string;
  reviewerName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

/** Bir kullanıcı (ilan sahibi) hakkında yazılmış yorumlar, en yeni önce. */
export async function reviewsForUser(userId: string): Promise<ReviewView[]> {
  const rows = await db
    .select({
      id: reviews.id,
      listingId: reviews.listingId,
      reviewerId: reviews.reviewerId,
      reviewerName: users.name,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
    })
    .from(reviews)
    .innerJoin(users, eq(reviews.reviewerId, users.id))
    .where(eq(reviews.targetUserId, userId))
    .orderBy(desc(reviews.createdAt));

  return rows.map((r) => ({
    id: r.id,
    listingId: r.listingId,
    reviewerId: r.reviewerId,
    reviewerName: r.reviewerName,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
  }));
}

/**
 * Bir kullanıcının rating/reviewCount denormalize alanlarını reviews tablosundan yeniden hesaplar.
 * Yeni bir yorum eklendiğinde çağrılır.
 */
export async function recomputeUserRating(userId: string): Promise<void> {
  const [agg] = await db
    .select({
      avg: sql<string | null>`avg(${reviews.rating})`,
      count: sql<number>`count(*)::int`,
    })
    .from(reviews)
    .where(eq(reviews.targetUserId, userId));

  const rating = agg.avg ? Number(agg.avg).toFixed(1) : "0";
  await db
    .update(users)
    .set({ rating, reviewCount: agg.count, updatedAt: new Date() })
    .where(eq(users.id, userId));
}
