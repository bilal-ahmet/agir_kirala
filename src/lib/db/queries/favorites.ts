import "server-only";

import { desc, eq, inArray } from "drizzle-orm";
import { db } from "../index";
import { favorites, listingPhotos, listings, users } from "../schema";
import type { Listing } from "../../types";
import { toListing } from "./mappers";

/** Kullanıcının favori ilan id'leri. */
export async function favoriteIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ listingId: favorites.listingId })
    .from(favorites)
    .where(eq(favorites.userId, userId));
  return rows.map((r) => r.listingId);
}

/** Favori ilanların tam kayıtları (foto ile), en son eklenen önce. */
export async function favoriteListings(userId: string): Promise<Listing[]> {
  const rows = await db
    .select({ listing: listings, addedAt: favorites.createdAt })
    .from(favorites)
    .innerJoin(listings, eq(favorites.listingId, listings.id))
    .where(eq(favorites.userId, userId))
    .orderBy(desc(favorites.createdAt));

  const listingRows = rows.map((r) => r.listing);
  if (!listingRows.length) return [];

  const [photos, owners] = await Promise.all([
    db.select().from(listingPhotos).where(inArray(listingPhotos.listingId, listingRows.map((l) => l.id))),
    db
      .select({ id: users.id, verified: users.verified, rating: users.rating })
      .from(users)
      .where(inArray(users.id, [...new Set(listingRows.map((l) => l.ownerId))])),
  ]);
  const ownerMap = new Map(owners.map((o) => [o.id, o]));

  return listingRows.map((l) =>
    toListing(
      l,
      photos.filter((p) => p.listingId === l.id),
      ownerMap.get(l.ownerId),
    ),
  );
}
