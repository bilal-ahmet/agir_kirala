// Kiralama tutarı hesaplama — saf fonksiyonlar (client önizleme + server action ortak kullanır).
// RentRequestForm.tsx'teki mantığın tek kaynağı.

import type { PriceMap, RentalPeriod } from "./types";

/** İki tarih arasındaki gün sayısı (dahil). daysBetween ile aynı mantık. */
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
  }
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

  // Gün bazlı kiralamada saatlik ek ücret.
  const hourly = prices.saatlik ?? 0;
  const hours = period !== "saatlik" && hourly > 0 ? hoursBetween(startTime, endTime) : 0;
  const hourAddon = hours * hourly;

  return { days, qty, unit, base, hourly, hours, hourAddon, total: base + hourAddon };
}
