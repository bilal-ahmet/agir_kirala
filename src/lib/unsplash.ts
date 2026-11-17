/**
 * Unsplash kaynaklı ilan görselleri — API kuralları:
 *  1. HOTLINK: görsel images.unsplash.com'dan gösterilir; kendi sunucumuzdan
 *     (next/image optimizer dahil) geçirilmez. Boyutlandırmayı Unsplash'in
 *     imgix CDN'i `w`/`q` parametreleriyle yapar.
 *  2. ATIF: görselin gösterildiği yerde fotoğrafçı ve Unsplash linkli yazılır.
 *  3. İNDİRME BİLDİRİMİ: görsel ilana eklenirken `download_location` çağrılır
 *     (bu, görselleri ekleyen bakım betiğinde yapılır, sayfada değil).
 */

export const UNSPLASH_UTM = "utm_source=kiralama_dunyasi&utm_medium=referral";
export const UNSPLASH_HOME = `https://unsplash.com/?${UNSPLASH_UTM}`;

export function isUnsplashUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    return new URL(url).hostname === "images.unsplash.com";
  } catch {
    return false;
  }
}

/** Unsplash görselini istenen genişlikte (retina için 2x) ister. */
export function unsplashSized(url: string, width: number): string {
  const u = new URL(url);
  u.searchParams.set("w", String(Math.min(Math.round(width * 2), 2400)));
  u.searchParams.set("q", "75");
  u.searchParams.set("auto", "format");
  u.searchParams.set("fit", "crop");
  return u.toString();
}
