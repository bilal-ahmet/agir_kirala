/**
 * Supabase Storage public URL'ini görüntü dönüştürme (image transformation)
 * uç noktasına çevirir; kart/thumbnail için tam çözünürlüklü orijinal indirilmesin.
 *
 *   .../storage/v1/object/public/bucket/path.jpg
 * → .../storage/v1/render/image/public/bucket/path.jpg?width=640&quality=75
 *
 * Dönüştürme kapalı/desteklenmiyorsa URL değiştirilmeden döner.
 */
export function storageImageUrl(url: string | undefined, width?: number): string | undefined {
  if (!url || !width) return url;
  const marker = "/storage/v1/object/public/";
  if (!url.includes(marker)) return url;
  const transformed = url.replace(marker, "/storage/v1/render/image/public/");
  const sep = transformed.includes("?") ? "&" : "?";
  return `${transformed}${sep}width=${width}&quality=75&resize=cover`;
}
