import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { favorites } from "../db/schema";
import type { User } from "../types";
import { mutated, type MutationResult } from "./errors";

const REVALIDATE = ["/hesap/favorilerim"];

/** Favori ekle/çıkar. Yeni durumu döner. */
export async function toggleFavorite(
  user: User,
  listingId: string,
): Promise<MutationResult<{ favorite: boolean }>> {
  const existing = await db.query.favorites.findFirst({
    where: and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId)),
  });

  if (existing) {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId)));
    return mutated({ favorite: false }, REVALIDATE);
  }

  await db.insert(favorites).values({ userId: user.id, listingId }).onConflictDoNothing();
  return mutated({ favorite: true }, REVALIDATE);
}
