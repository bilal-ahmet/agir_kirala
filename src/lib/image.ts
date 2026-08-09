/**
 * Supabase Storage görsel URL'i.
 *
 * Supabase'in görüntü dönüştürme (image transformation) uç noktası
 * `/storage/v1/render/image/public/...` ÜCRETLİ bir özelliktir. Kapalı planlarda
 * 403 `FeatureNotEnabled` döner ve tüm görseller kırık görünür — bu yüzden
 * VARSAYILAN OLARAK KAPALIDIR ve ham public URL kullanılır.
 *
 * Planınız dönüştürmeyi destekliyorsa `.env.local` içinde
 * `NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM=1` yaparak açabilirsiniz; o zaman
 * kartlar/thumbnail'ler tam çözünürlüklü orijinal yerine küçültülmüş sürümü
 * indirir (belirgin bant genişliği tasarrufu).
 */
const TRANSFORM_ENABLED = process.env.NEXT_PUBLIC_SUPABASE_IMAGE_TRANSFORM === "1";

export function storageImageUrl(url: string | undefined, width?: number): string | undefined {
  if (!url || !width || !TRANSFORM_ENABLED) return url;
  const marker = "/storage/v1/object/public/";
  if (!url.includes(marker)) return url;
  const transformed = url.replace(marker, "/storage/v1/render/image/public/");
  const sep = transformed.includes("?") ? "&" : "?";
  return `${transformed}${sep}width=${width}&quality=75&resize=cover`;
}
