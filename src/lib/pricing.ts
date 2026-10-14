// Kiralama tutarı hesaplama — saf fonksiyonlar (client önizleme + server action ortak kullanır).
// RentRequestForm.tsx'teki mantığın tek kaynağı.

import { getCategory } from "./categories";
import type { PriceMap, RentalPeriod } from "./types";

/**
 * İki tarih arasındaki gün sayısı — iki uç da DAHİL: 1–3 Eylül = 3 gün.
 * Client önizleme (format.ts üzerinden) ve sunucu tutarı bunu paylaşır.
 */
export function daysBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(diff + 1, 0);
}

/** Periyot başına süre adedini hesaplar. */
export function quantityFor(period: RentalPeriod, days: number): number {
  switch (period) {
    case "saatlik":
      return Math.max(1, days * 8);
    case "gunluk":
      return Math.max(1, days);
    case "haftalik":
      return Math.max(1, Math.ceil(days / 7));
    case "aylik":
      return Math.max(1, Math.ceil(days / 30));
    case "yillik":
      return Math.max(1, Math.ceil(days / 365));
    case "sefer":
      // Bir talep = bir sefer; tarih aralığı yalnız yükleme günlerini belirtir.
      return 1;
  }
}

/**
 * Yayındaki ilanın fiyat değişmezi. Hata metni döner, sorun yoksa null.
 *
 * Makinelerde saatlik ücret zorunlu (talep formu gün bazlı kiralamada saatlik
 * ek ücreti ondan hesaplar). Sefer fiyatlı kategorilerde (tır) saatlik ücret
 * anlamsız; en az bir fiyat yeterli.
 */
export function publishPriceError(categorySlug: string, prices: PriceMap | undefined): string | null {
  if (getCategory(categorySlug)?.tripPricing) {
    const any = Object.values(prices ?? {}).some((v) => v != null);
    return any ? null : "Yayınlamak için en az bir fiyat (sefer başı, günlük veya aylık) zorunludur.";
  }
  return prices?.saatlik == null ? "Yayınlamak için saatlik ücret zorunludur." : null;
}

/** İki saat ("08:00", "10:00") arasındaki tam saat farkı. */
export function hoursBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const sh = Number(start.slice(0, 2));
  const eh = Number(end.slice(0, 2));
  return Math.max(0, eh - sh);
}

export interface RentalCalc {
  days: number;
  qty: number;
  unit: number;
  base: number;
  hourly: number;
  hours: number;
  hourAddon: number;
  total: number;
}

/**
 * Kiralama toplamını hesaplar. Geçersiz girdide null döner.
 * Client önizleme ve createRentalRequest action bunu kullanır — tutar server'da yeniden hesaplanır.
 */
export function computeRentalTotal(
  prices: PriceMap,
  period: RentalPeriod,
  startDate: string,
  endDate: string,
  startTime = "",
  endTime = "",
): RentalCalc | null {
  if (!startDate || !endDate) return null;
  const days = daysBetween(startDate, endDate);
  if (days <= 0) return null;
  const unit = prices[period];
  if (unit == null) return null;

  const qty = quantityFor(period, days);
  const base = unit * qty;

  // Gün bazlı kiralamada saatlik ek ücret (seferde uygulanmaz).
  const hourly = prices.saatlik ?? 0;
  const hours =
    period !== "saatlik" && period !== "sefer" && hourly > 0 ? hoursBetween(startTime, endTime) : 0;
  const hourAddon = hours * hourly;

  return { days, qty, unit, base, hourly, hours, hourAddon, total: base + hourAddon };
}
