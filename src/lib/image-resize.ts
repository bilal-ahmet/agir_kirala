"use client";

/**
 * Tarayıcıda görsel küçültme.
 *
 * Neden: ilan başına 8 × 5 MB fotoğraf hem depolamayı hem mobil veri kullanımını
 * boğuyordu. Kimsenin kiralama ilanı için 4000 pikselli orijinale ihtiyacı yok.
 * Yükleme anında iki çıktı üretilir; ham dosya hiç yüklenmez:
 *   thumb    → 400 px  WebP q75  (liste/kart)
 *   original → 1600 px WebP q80  (detay galerisi)
 *
 * Desteklemeyen tarayıcıda (OffscreenCanvas / WebP encode yoksa) zarif düşüş:
 * null döner, çağıran ham dosyayı yükler ve thumbPath göndermez — sunucu bunu
 * zaten opsiyonel kabul ediyor.
 */

export const THUMB_WIDTH = 400;
export const ORIGINAL_MAX_WIDTH = 1600;

function supported(): boolean {
  return typeof createImageBitmap === "function" && typeof OffscreenCanvas === "function";
}

async function encode(
  bitmap: ImageBitmap,
  maxWidth: number,
  quality: number,
): Promise<Blob | null> {
  // Küçültme yalnızca büyütmez: zaten küçük bir görsel şişirilmez.
  const scale = Math.min(1, maxWidth / bitmap.width);
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(bitmap, 0, 0, w, h);

  const blob = await canvas.convertToBlob({ type: "image/webp", quality });
  // WebP desteklenmiyorsa tarayıcı sessizce PNG üretebilir — kabul etmeyiz,
  // çünkü sunucu tarafında hedef yol .webp olarak imzalandı.
  return blob.type === "image/webp" ? blob : null;
}

export interface ResizedImage {
  original: Blob;
  thumb: Blob;
}

/** İki boyutu üretir; küçültme mümkün değilse null. */
export async function resizeForUpload(file: File): Promise<ResizedImage | null> {
  if (!supported()) return null;

  try {
    // imageOrientation: EXIF döndürme bilgisi uygulanır, yoksa telefonla çekilen
    // dikey fotoğraflar yan yatmış olarak kaydedilirdi.
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    try {
      const [original, thumb] = await Promise.all([
        encode(bitmap, ORIGINAL_MAX_WIDTH, 0.8),
        encode(bitmap, THUMB_WIDTH, 0.75),
      ]);
      if (!original || !thumb) return null;
      return { original, thumb };
    } finally {
      bitmap.close();
    }
  } catch {
    return null;
  }
}
