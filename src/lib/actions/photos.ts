"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { listingPhotos, listings } from "../db/schema";
import { verifySession } from "../auth/session";
import { getSupabaseAdmin, LISTING_PHOTOS_BUCKET } from "../supabase";

// Görsel YÜKLEME artık burada değil: dosyalar tarayıcıdan doğrudan Supabase'e
// gider (src/lib/actions/uploads.ts + src/lib/upload-client.ts). Sebebi Vercel
// Serverless Function'lardaki 4.5 MB'lık sabit istek gövdesi sınırı.

/** İlan görselini siler (Storage + DB). Yalnızca ilan sahibi. */
export async function deleteListingPhotoAction(photoId: string): Promise<{ error?: string }> {
  const user = await verifySession();

  const photo = await db.query.listingPhotos.findFirst({
    where: eq(listingPhotos.id, photoId),
  });
  if (!photo) return { error: "Görsel bulunamadı." };

  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, photo.listingId), eq(listings.ownerId, user.id)),
    columns: { id: true },
  });
  if (!listing) return { error: "Yetkiniz yok." };

  await getSupabaseAdmin().storage.from(LISTING_PHOTOS_BUCKET).remove([photo.storagePath]);
  await db.delete(listingPhotos).where(eq(listingPhotos.id, photoId));

  revalidatePath(`/ilanlar/${photo.listingId}`);
  return {};
}
