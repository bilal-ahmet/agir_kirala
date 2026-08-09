"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { listings } from "../db/schema";
import { verifySession } from "../auth/session";
import { getSupabaseAdmin, LISTING_VIDEOS_BUCKET } from "../supabase";
import { ALLOWED_VIDEO_TYPES, MAX_VIDEO_BYTES } from "../constants";

const EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

/**
 * İlan tanıtım videosunu Supabase Storage'a yükler ve listings.video_url'i günceller.
 * İlan başına tek video: yenisi yüklenirse eskisi silinir. Yalnızca ilan sahibi.
 * FormData "video" alanında tek File taşınır.
 */
export async function uploadListingVideoAction(
  listingId: string,
  formData: FormData,
): Promise<{ url?: string; error?: string }> {
  const user = await verifySession();

  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.ownerId, user.id)),
    columns: { id: true, videoPath: true },
  });
  if (!listing) return { error: "İlan bulunamadı veya yetkiniz yok." };

  const file = formData.get("video");
  if (!(file instanceof File) || file.size === 0) return { error: "Video dosyası bulunamadı." };
  if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
    return { error: "Yalnızca MP4, WebM veya MOV video yükleyebilirsiniz." };
  }
  if (file.size > MAX_VIDEO_BYTES) {
    return { error: `Video en fazla ${Math.floor(MAX_VIDEO_BYTES / (1024 * 1024))} MB olabilir.` };
  }

  const supabase = getSupabaseAdmin();
  const path = `${listingId}/${randomUUID()}.${EXT[file.type] ?? "mp4"}`;
  const bytes = new Uint8Array(await file.arrayBuffer());

  const { error } = await supabase.storage
    .from(LISTING_VIDEOS_BUCKET)
    .upload(path, bytes, { contentType: file.type, upsert: false });
  if (error) return { error: `Video yüklenemedi: ${error.message}` };

  const { data } = supabase.storage.from(LISTING_VIDEOS_BUCKET).getPublicUrl(path);

  await db
    .update(listings)
    .set({ videoUrl: data.publicUrl, videoPath: path, updatedAt: new Date() })
    .where(eq(listings.id, listingId));

  // Eski videoyu (varsa) storage'dan temizle.
  if (listing.videoPath) {
    await supabase.storage.from(LISTING_VIDEOS_BUCKET).remove([listing.videoPath]);
  }

  revalidatePath(`/ilanlar/${listingId}`);
  revalidatePath("/hesap/ilanlarim");
  return { url: data.publicUrl };
}

/** İlan videosunu siler (Storage + DB). Yalnızca ilan sahibi. */
export async function deleteListingVideoAction(listingId: string): Promise<{ error?: string }> {
  const user = await verifySession();

  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.ownerId, user.id)),
    columns: { id: true, videoPath: true },
  });
  if (!listing) return { error: "İlan bulunamadı veya yetkiniz yok." };

  if (listing.videoPath) {
    await getSupabaseAdmin().storage.from(LISTING_VIDEOS_BUCKET).remove([listing.videoPath]);
  }
  await db
    .update(listings)
    .set({ videoUrl: null, videoPath: null, updatedAt: new Date() })
    .where(eq(listings.id, listingId));

  revalidatePath(`/ilanlar/${listingId}`);
  revalidatePath("/hesap/ilanlarim");
  return {};
}
