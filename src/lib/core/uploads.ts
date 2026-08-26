import "server-only";

import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db } from "../db";
import { listingPhotos, listings } from "../db/schema";
import { getSupabaseAdmin, LISTING_PHOTOS_BUCKET, LISTING_VIDEOS_BUCKET } from "../supabase";
import { ALLOWED_VIDEO_TYPES, MAX_VIDEO_BYTES } from "../constants";
import type { User } from "../types";
import { fail, mutated, type MutationResult } from "./errors";
import type { MediaKind } from "./schemas";
export type { MediaKind };
import { assertOwnership } from "./listings";

/**
 * DOĞRUDAN YÜKLEME (istemci → Supabase Storage)
 *
 * Dosyalar sunucu üzerinden TAŞINMAZ. Sunucu yalnızca kısa ömürlü imzalı bilet
 * üretir; istemci dosyayı doğrudan Supabase'e gönderir. Sebebi: Vercel'de istek
 * gövdesi 4.5 MB ile SABİT sınırlı ve hiçbir Next ayarıyla yükseltilemiyor.
 *
 * GÖRSEL KÜÇÜLTME: istemci her fotoğraf için İKİ dosya üretir —
 *   thumb    400 px  WebP q75  (~20-40 KB) → liste/kart
 *   original 1600 px WebP q80  (~200-400 KB) → detay galerisi
 * Ham 5 MB dosya hiç yüklenmez. Aksi halde mobil detay galerisi 8 × 5 MB = 40 MB
 * indirirdi. Foto formatı SUNUCU DAYATMASIDIR (.webp): istemciden contentType
 * alınmaz, doğrulama yüzeyi küçülür.
 */

export const MAX_PHOTOS = 8;
export const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
/** Küçük boy için üst sınır — istemciye güvenilmez, yoksa thumb yerine 50 MB konulabilir. */
export const MAX_THUMB_BYTES = 600 * 1024;
export const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

const VIDEO_EXT: Record<string, string> = {
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
};


/** Tek bir imzalı hedef. `token`, Flutter'ın uploadToSignedUrl(path, token, file) çağrısı için. */
export interface SignedTarget {
  signedUrl: string;
  token: string;
  path: string;
}

export interface UploadTicket {
  kind: MediaKind;
  bucket: string;
  original: SignedTarget;
  /** Yalnız foto biletlerinde. Küçültmeyi yapamayan istemci bunu yok sayabilir. */
  thumb?: SignedTarget;
}

function mb(bytes: number): number {
  return Math.floor(bytes / (1024 * 1024));
}

async function signUpload(bucket: string, path: string): Promise<SignedTarget | null> {
  const { data, error } = await getSupabaseAdmin().storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) return null;
  return { signedUrl: data.signedUrl, token: data.token, path: data.path };
}

/**
 * İmzalı yükleme bileti üretir. Tür/boyut/adet doğrulaması BURADA yapılır.
 * Foto için orijinal + küçük boy olmak üzere iki hedef döner; ikisi aynı UUID'yi
 * paylaşır, böylece eşleştikleri bakışta bellidir.
 */
export async function createUploadTicket(
  user: User,
  listingId: string,
  kind: MediaKind,
  contentType?: string,
  size?: number,
): Promise<MutationResult<UploadTicket>> {
  const owned = await assertOwnership(user.id, listingId);
  if (!owned.ok) return owned;

  const uuid = randomUUID();

  if (kind === "video") {
    if (!contentType || !ALLOWED_VIDEO_TYPES.includes(contentType)) {
      return fail("validation", "Yalnızca MP4, WebM veya MOV video yükleyebilirsiniz.");
    }
    if (size != null && size > MAX_VIDEO_BYTES) {
      return fail("limit_exceeded", `Video en fazla ${mb(MAX_VIDEO_BYTES)} MB olabilir.`);
    }
    const path = `${listingId}/${uuid}.${VIDEO_EXT[contentType] ?? "mp4"}`;
    const original = await signUpload(LISTING_VIDEOS_BUCKET, path);
    if (!original) return fail("internal", "Yükleme adresi alınamadı.");
    return mutated({ kind, bucket: LISTING_VIDEOS_BUCKET, original });
  }

  const [{ n }] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId));
  if (n >= MAX_PHOTOS) {
    return fail("limit_exceeded", `En fazla ${MAX_PHOTOS} görsel yükleyebilirsiniz.`);
  }

  // Format sunucu dayatması: istemci ne gönderirse göndersin hedef .webp'dir.
  const original = await signUpload(LISTING_PHOTOS_BUCKET, `${listingId}/${uuid}.webp`);
  const thumb = await signUpload(LISTING_PHOTOS_BUCKET, `${listingId}/${uuid}_400.webp`);
  if (!original || !thumb) return fail("internal", "Yükleme adresi alınamadı.");

  return mutated({ kind, bucket: LISTING_PHOTOS_BUCKET, original, thumb });
}

/** Storage'daki dosyanın boyutunu döner; yoksa null. */
async function storedSize(bucket: string, path: string): Promise<number | null> {
  const [dir, file] = [path.slice(0, path.indexOf("/")), path.slice(path.indexOf("/") + 1)];
  const { data } = await getSupabaseAdmin().storage.from(bucket).list(dir, { search: file });
  const found = data?.find((f) => f.name === file);
  if (!found) return null;
  return typeof found.metadata?.size === "number" ? found.metadata.size : 0;
}

/**
 * İstemci yüklemeyi bitirdikten sonra çağrılır: dosyaların Storage'da gerçekten
 * var olduğunu doğrular ve veritabanına yazar.
 *
 * thumbPath opsiyoneldir ve doğrulaması düşerse SESSİZCE atlanır — küçültme
 * başarısız oldu diye ilan yüklemesi ölmemeli. O satır thumbUrl=null kalır ve
 * serializer orijinale düşer.
 */
export async function registerUploadedMedia(
  user: User,
  listingId: string,
  kind: MediaKind,
  path: string,
  thumbPath?: string,
): Promise<MutationResult<{ url: string; thumbUrl: string }>> {
  const owned = await assertOwnership(user.id, listingId);
  if (!owned.ok) return owned;

  // Yol mutlaka bu ilanın klasöründe olmalı — istemciden gelen değere güvenilmez.
  if (!path.startsWith(`${listingId}/`)) return fail("validation", "Geçersiz dosya yolu.");
  if (thumbPath && !thumbPath.startsWith(`${listingId}/`)) {
    return fail("validation", "Geçersiz dosya yolu.");
  }

  const bucket = kind === "video" ? LISTING_VIDEOS_BUCKET : LISTING_PHOTOS_BUCKET;
  const supabase = getSupabaseAdmin();

  const size = await storedSize(bucket, path);
  if (size == null) return fail("not_found", "Yüklenen dosya bulunamadı, lütfen tekrar deneyin.");
  const maxOriginal = kind === "video" ? MAX_VIDEO_BYTES : MAX_PHOTO_BYTES;
  if (size > maxOriginal) {
    await supabase.storage.from(bucket).remove([path]);
    return fail("limit_exceeded", `Dosya en fazla ${mb(maxOriginal)} MB olabilir.`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);

  if (kind === "video") {
    await db
      .update(listings)
      .set({ videoUrl: data.publicUrl, videoPath: path, updatedAt: new Date() })
      .where(eq(listings.id, listingId));
    // Eskisini temizle (ilan başına tek video).
    if (owned.value.videoPath && owned.value.videoPath !== path) {
      await supabase.storage.from(bucket).remove([owned.value.videoPath]);
    }
    return mutated({ url: data.publicUrl, thumbUrl: data.publicUrl }, [
      `/ilanlar/${listingId}`,
      "/hesap/ilanlarim",
    ]);
  }

  // Küçük boy: varsa doğrula, düşerse sessizce yok say (ilan yüklemesi ölmesin).
  let thumbUrl: string | null = null;
  let thumbStoragePath: string | null = null;
  if (thumbPath) {
    const thumbSize = await storedSize(bucket, thumbPath);
    if (thumbSize != null && thumbSize <= MAX_THUMB_BYTES) {
      thumbUrl = supabase.storage.from(bucket).getPublicUrl(thumbPath).data.publicUrl;
      thumbStoragePath = thumbPath;
    } else if (thumbSize != null) {
      // Sınırı aşan "küçük boy" depoda bırakılmaz.
      await supabase.storage.from(bucket).remove([thumbPath]);
    }
  }

  const [{ maxOrder }] = await db
    .select({ maxOrder: sql<number>`coalesce(max(${listingPhotos.sortOrder}), -1)::int` })
    .from(listingPhotos)
    .where(eq(listingPhotos.listingId, listingId));

  await db.insert(listingPhotos).values({
    listingId,
    url: data.publicUrl,
    storagePath: path,
    thumbUrl,
    thumbStoragePath,
    sortOrder: maxOrder + 1,
  });

  return mutated({ url: data.publicUrl, thumbUrl: thumbUrl ?? data.publicUrl }, [
    `/ilanlar/${listingId}`,
    "/hesap/ilanlarim",
  ]);
}

/** İlan görselini siler (Storage'daki İKİ dosya + DB satırı). */
export async function deleteListingPhoto(
  user: User,
  photoId: string,
): Promise<MutationResult<{ id: string }>> {
  const photo = await db.query.listingPhotos.findFirst({
    where: eq(listingPhotos.id, photoId),
  });
  if (!photo) return fail("not_found", "Görsel bulunamadı.");

  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, photo.listingId), eq(listings.ownerId, user.id)),
    columns: { id: true },
  });
  if (!listing) return fail("forbidden", "Yetkiniz yok.");

  // Orijinal + küçük boy birlikte temizlenir; yoksa küçük boylar depoda birikirdi.
  const paths = [photo.storagePath, photo.thumbStoragePath].filter((p): p is string => !!p);
  await getSupabaseAdmin().storage.from(LISTING_PHOTOS_BUCKET).remove(paths);
  await db.delete(listingPhotos).where(eq(listingPhotos.id, photoId));

  return mutated({ id: photoId }, [`/ilanlar/${photo.listingId}`, "/hesap/ilanlarim"]);
}

/** İlan videosunu siler (Storage + DB). */
export async function deleteListingVideo(
  user: User,
  listingId: string,
): Promise<MutationResult<{ id: string }>> {
  const owned = await assertOwnership(user.id, listingId);
  if (!owned.ok) return owned;

  if (owned.value.videoPath) {
    await getSupabaseAdmin().storage.from(LISTING_VIDEOS_BUCKET).remove([owned.value.videoPath]);
  }
  await db
    .update(listings)
    .set({ videoUrl: null, videoPath: null, updatedAt: new Date() })
    .where(eq(listings.id, listingId));

  return mutated({ id: listingId }, [`/ilanlar/${listingId}`, "/hesap/ilanlarim"]);
}
