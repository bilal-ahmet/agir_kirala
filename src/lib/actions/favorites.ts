"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { favorites } from "../db/schema";
import { verifySession } from "../auth/session";

/** Favori ekle/çıkar. Oturum yoksa /giris'e yönlendirir. Yeni durumu döner. */
export async function toggleFavoriteAction(listingId: string): Promise<{ favorite: boolean }> {
  const user = await verifySession();

  const existing = await db.query.favorites.findFirst({
    where: and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId)),
  });

  if (existing) {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, user.id), eq(favorites.listingId, listingId)));
    revalidatePath("/hesap/favorilerim");
    return { favorite: false };
  }

  await db.insert(favorites).values({ userId: user.id, listingId }).onConflictDoNothing();
  revalidatePath("/hesap/favorilerim");
  return { favorite: true };
}
