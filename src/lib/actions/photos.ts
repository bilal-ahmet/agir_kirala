"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { listingPhotos, listings } from "../db/schema";
import { verifySession } from "../auth/session";
import { getSupabaseAdmin, LISTING_PHOTOS_BUCKET } from "../supabase";

const MAX_FILES = 8;
const MAX_BYTES = 5 * 1024 * 1024; // 5 MB
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);

/**
 * İlan için görselleri Supabase Storage'a yükler ve listing_photos'a yazar.
 * FormData "photos" alanında File'lar taşınır. Yalnızca ilan sahibi.
 */
export async function uploadListingPhotosAction(
  listingId: string,
  formData: FormData,
): Promise<{ uploaded?: number; error?: string }> {
  const user = await verifySession();

  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.ownerId, user.id)),
    columns: { id: true },
  });
  if (!listing) return { error: "İlan bulunamadı veya yetkiniz yok." };

  const files = formData.getAll("photos").filter((f): f is File => f instanceof File && f.size > 0);
  if (!files.length) return { uploaded: 0 };
  if (files.length > MAX_FILES) return { error: `En fazla ${MAX_FILES} görsel yükleyebilirsiniz.` };

  const supabase = getSupabaseAdmin();

  // Mevcut en büyük sort_order'ı bul (var olan ilana ekleme için).
  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${listingPhotos.sortOrder}), -1)::int` })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId));

  let order = maxOrder + 1;
  let uploaded = 0;

  for (const file of files) {
    if (!ALLOWED.has(file.type)) return { error: "Yalnızca JPEG, PNG veya WebP görseller." };
    if (file.size > MAX_BYTES) return { error: "Her görsel en fazla 5 MB olabilir." };

    const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
    const path = `${listingId}/${randomUUID()}.${ext}`;
    const bytes = new Uint8Array(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from(LISTING_PHOTOS_BUCKET)
      .upload(path, bytes, { contentType: file.type, upsert: false });
    if (error) return { error: `Görsel yüklenemedi: ${error.message}` };

    const { data } = supabase.storage.from(LISTING_PHOTOS_BUCKET).getPublicUrl(path);
    await db.insert(listingPhotos).values({
      listingId,
      url: data.publicUrl,
      storagePath: path,
      sortOrder: order++,
    });
    uploaded++;
  }

  revalidatePath(`/ilanlar/${listingId}`);
  revalidatePath("/hesap/ilanlarim");
  return { uploaded };
}

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
