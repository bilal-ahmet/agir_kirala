import type {
  FuelType,
  OwnerType,
  RentalPeriod,
  SortKey,
  TransportOption,
} from "./types";

export const PERIODS: { value: RentalPeriod; label: string; short: string }[] = [
  { value: "saatlik", label: "Saatlik", short: "saat" },
  { value: "gunluk", label: "Günlük", short: "gün" },
  { value: "haftalik", label: "Haftalık", short: "hafta" },
  { value: "aylik", label: "Aylık", short: "ay" },
  { value: "yillik", label: "Yıllık", short: "yıl" },
];

/** İlan ekleme formunda sunulan fiyatlandırma periyotları: saat / gün / ay / yıl */
export const LISTING_PERIODS: { value: RentalPeriod; label: string; short: string }[] = [
  { value: "saatlik", label: "Saatlik", short: "saat" },
  { value: "gunluk", label: "Günlük", short: "gün" },
  { value: "aylik", label: "Aylık", short: "ay" },
  { value: "yillik", label: "Yıllık", short: "yıl" },
];

export const PERIOD_LABELS: Record<RentalPeriod, string> = {
  saatlik: "Saatlik",
  gunluk: "Günlük",
  haftalik: "Haftalık",
  aylik: "Aylık",
  yillik: "Yıllık",
};

/** Bir periyodun yaklaşık gün karşılığı (toplam tutar tahmini için) */
export const PERIOD_IN_DAYS: Record<RentalPeriod, number> = {
  saatlik: 1 / 9, // ~9 saatlik mesai günü
  gunluk: 1,
  haftalik: 7,
  aylik: 30,
  yillik: 365,
};

export const FUEL_LABELS: Record<FuelType, string> = {
  dizel: "Dizel",
  benzin: "Benzin",
  elektrik: "Elektrik",
  lpg: "LPG",
  hibrit: "Hibrit",
};

export const TRANSPORT_LABELS: Record<TransportOption, string> = {
  dahil: "Nakliye Dahil",
  ekstra: "Nakliye Ekstra",
  yok: "Nakliye Yok (Müşteri Alır)",
};

export const OWNER_TYPE_LABELS: Record<OwnerType, string> = {
  bireysel: "Bireysel",
  kurumsal: "Kurumsal",
};

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "onerilen", label: "Önerilen" },
  { value: "yeni", label: "En Yeni İlan" },
  { value: "fiyat-artan", label: "Fiyat (Artan)" },
  { value: "fiyat-azalan", label: "Fiyat (Azalan)" },
  { value: "yil-yeni", label: "Model Yılı (Yeni)" },
  { value: "kullanim-az", label: "En Az Kullanılmış" },
  { value: "puan", label: "Satıcı Puanı" },
];

export const MIN_YEAR = 2005;
export const MAX_YEAR = new Date().getFullYear();
export const RESULTS_PER_PAGE = 12;
