"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { listingPhotos, listings } from "../db/schema";
import { verifySession } from "../auth/session";
import { getSupabaseAdmin, LISTING_PHOTOS_BUCKET, LISTING_VIDEOS_BUCKET } from "../supabase";
import { ALLOWED_VIDEO_TYPES, MAX_VIDEO_BYTES } from "../constants";

/**
 * DOĞRUDAN YÜKLEME (browser → Supabase Storage)
 *
 * Dosyalar artık server action gövdesinde TAŞINMAZ. Sunucu yalnızca kısa ömürlü
 * bir imzalı yükleme bileti üretir; tarayıcı dosyayı doğrudan Supabase'e PUT eder.
 *
 * Sebebi: Vercel Serverless Function'larda istek gövdesi 4.5 MB ile SABİT olarak
 * sınırlı ve hiçbir Next ayarıyla (serverActions.bodySizeLimit,
 * proxyClientMaxBodySize) yükseltilemiyor. 15 MB'lık bir video server action
 * üzerinden hiçbir zaman geçemezdi. Bu yolla platform gövde limitleri,
 * ters vekil limitleri ve sunucu bellek baskısı tamamen devre dışı kalır.
 */

const MAX_PHOTOS = 8;
const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const PHOTO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};

export type MediaKind = "photo" | "video";

export interface UploadTicket {
  /** Tarayıcının PUT edeceği tam imzalı adres (token içinde). */
  signedUrl: string;
  /** Bucket içindeki hedef yol — yükleme sonrası kayıt için geri gönderilir. */
  path: string;
  kind: MediaKind;
}

function mb(bytes: number): number {
  return Math.floor(bytes / (1024 * 1024));
}

/** İlanın gerçekten bu kullanıcıya ait olduğunu doğrular. */
async function sahipMi(listingId: string, userId: string) {
  return db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.ownerId, userId)),
    columns: { id: true, videoPath: true },
  });
}

/**
 * Tarayıcının doğrudan yükleme yapabilmesi için imzalı bilet üretir.
 * Tür/boyut/adet doğrulaması BURADA yapılır — istemciye güvenilmez.
 */
export async function createUploadTicketAction(
  listingId: string,
  kind: MediaKind,
  contentType: string,
  size: number,
): Promise<{ ticket?: UploadTicket; error?: string }> {
  try {
    const user = await verifySession();
    const listing = await sahipMi(listingId, user.id);
    if (!listing) return { error: "İlan bulunamadı veya yetkiniz yok." };

    let bucket: string;
    let ext: string;

    if (kind === "video") {
      if (!ALLOWED_VIDEO_TYPES.includes(contentType)) {
        return { error: "Yalnızca MP4, WebM veya MOV video yükleyebilirsiniz." };
      }
      if (size > MAX_VIDEO_BYTES) {
        return { error: `Video en fazla ${mb(MAX_VIDEO_BYTES)} MB olabilir.` };
      }
      bucket = LISTING_VIDEOS_BUCKET;
      ext = VIDEO_EXT[contentType] ?? "mp4";
    } else {
      if (!ALLOWED_PHOTO_TYPES.includes(contentType)) {
        return { error: "Yalnızca JPEG, PNG veya WebP görsel yükleyebilirsiniz." };
      }
      if (size > MAX_PHOTO_BYTES) {
        return { error: `Her görsel en fazla ${mb(MAX_PHOTO_BYTES)} MB olabilir.` };
      }
      const [{ n }] = await db
        .select({ n: sql<number>`count(*)::int` })
        .from(listingPhotos)
        .where(eq(listingPhotos.listingId, listingId));
      if (n >= MAX_PHOTOS) {
        return { error: `En fazla ${MAX_PHOTOS} görsel yükleyebilirsiniz.` };
      }
      bucket = LISTING_PHOTOS_BUCKET;
      ext = PHOTO_EXT[contentType] ?? "jpg";
    }

    const path = `${listingId}/${randomUUID()}.${ext}`;
    const { data, error } = await getSupabaseAdmin()
      .storage.from(bucket)
      .createSignedUploadUrl(path);
    if (error || !data) {
      return { error: `Yükleme adresi alınamadı: ${error?.message ?? "bilinmeyen hata"}` };
    }

    return { ticket: { signedUrl: data.signedUrl, path: data.path, kind } };
  } catch (e) {
    console.error("[createUploadTicketAction] başarısız:", e);
    return { error: `Yükleme hazırlanamadı: ${e instanceof Error ? e.message : String(e)}` };
  }
}

/**
 * Tarayıcı yüklemeyi bitirdikten sonra çağrılır: dosyanın Storage'da gerçekten
 * var olduğunu doğrular ve veritabanına yazar.
 */
export async function registerUploadedMediaAction(
  listingId: string,
  kind: MediaKind,
  path: string,
): Promise<{ url?: string; error?: string }> {
  try {
    const user = await verifySession();
    const listing = await sahipMi(listingId, user.id);
    if (!listing) return { error: "İlan bulunamadı veya yetkiniz yok." };

    // Yol mutlaka bu ilanın klasöründe olmalı — istemciden gelen değere güvenilmez.
    if (!path.startsWith(`${listingId}/`)) return { error: "Geçersiz dosya yolu." };

    const bucket = kind === "video" ? LISTING_VIDEOS_BUCKET : LISTING_PHOTOS_BUCKET;
    const supabase = getSupabaseAdmin();

    // Dosya gerçekten yüklenmiş mi?
    const { data: liste } = await supabase.storage
      .from(bucket)
      .list(listingId, { search: path.split("/")[1] });
    if (!liste?.length) return { error: "Yüklenen dosya bulunamadı, lütfen tekrar deneyin." };

    const { data } = supabase.storage.from(bucket).getPublicUrl(path);

    if (kind === "video") {
      await db
        .update(listings)
        .set({ videoUrl: data.publicUrl, videoPath: path, updatedAt: new Date() })
        .where(eq(listings.id, listingId));
      // Eskisini temizle (ilan başına tek video).
      if (listing.videoPath && listing.videoPath !== path) {
        await supabase.storage.from(bucket).remove([listing.videoPath]);
      }
    } else {
      const [{ maxOrder }] = await db
        .select({ maxOrder: sql<number>`coalesce(max(${listingPhotos.sortOrder}), -1)::int` })
        .from(listingPhotos)
        .where(eq(listingPhotos.listingId, listingId));
      await db.insert(listingPhotos).values({
        listingId,
        url: data.publicUrl,
        storagePath: path,
        sortOrder: maxOrder + 1,
      });
    }

    revalidatePath(`/ilanlar/${listingId}`);
    revalidatePath("/hesap/ilanlarim");
    return { url: data.publicUrl };
  } catch (e) {
    console.error("[registerUploadedMediaAction] başarısız:", e);
    return { error: `Medya kaydedilemedi: ${e instanceof Error ? e.message : String(e)}` };
  }
}
