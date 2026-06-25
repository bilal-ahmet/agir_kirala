import { PERIODS, PERIOD_LABELS } from "./constants";
import type { PriceMap, RentalPeriod } from "./types";

const tl = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

const num = new Intl.NumberFormat("tr-TR");

/** ₺ biçimli para */
export function formatPrice(value: number): string {
  return tl.format(value);
}

/** Binlik ayraçlı sayı */
export function formatNumber(value: number): string {
  return num.format(value);
}

/** Periyot kısaltması ile fiyat: "12.500 ₺/gün" */
export function formatPriceWithPeriod(value: number, period: RentalPeriod): string {
  const short = PERIODS.find((p) => p.value === period)?.short ?? "";
  return `${tl.format(value)}/${short}`;
}

/** İlanın gösterilecek "ana" fiyatını seçer: günlük > saatlik > haftalık > aylık */
export function primaryPrice(prices: PriceMap): { value: number; period: RentalPeriod } | null {
  const order: RentalPeriod[] = ["gunluk", "saatlik", "haftalik", "aylik", "yillik"];
  for (const period of order) {
    const value = prices[period];
    if (value != null) return { value, period };
  }
  return null;
}

export function periodLabel(period: RentalPeriod): string {
  return PERIOD_LABELS[period];
}

/** Kullanım ölçüsü: saat (motosaat) veya km */
export function formatUsage(value: number, metric: "saat" | "km"): string {
  return metric === "saat" ? `${num.format(value)} saat` : `${num.format(value)} km`;
}

/** "12 Mart 2026" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/** "Mart 2024" — üyelik tarihi gibi */
export function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });
}

/** "3 gün önce" tarzı göreli süre */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "az önce";
  if (mins < 60) return `${mins} dakika önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} gün önce`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} ay önce`;
  return `${Math.floor(months / 12)} yıl önce`;
}

/** İki tarih arasındaki gün sayısı (dahil) */
export function daysBetween(startISO: string, endISO: string): number {
  const start = new Date(startISO);
  const end = new Date(endISO);
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000);
  return Math.max(diff + 1, 0);
}
