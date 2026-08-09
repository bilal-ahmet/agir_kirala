import type {
  FuelType,
  ListingCondition,
  OwnerType,
  RentalPeriod,
  SortKey,
  TransportFilter,
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

/** Filtredeki sadeleştirilmiş nakliye seçimi. "var" = dahil veya ekstra. */
export const NAKLIYE_LABELS: Record<TransportFilter, string> = {
  var: "Nakliye Var",
  yok: "Nakliye Yok",
};

/** "var" seçiminin karşılık geldiği transport değerleri. */
export const TRANSPORT_VAR_VALUES: TransportOption[] = ["dahil", "ekstra"];

export const CONDITION_LABELS: Record<ListingCondition, string> = {
  sifir: "Sıfır",
  ikinci_el: "2. El",
};

export const FUEL_TYPES: FuelType[] = ["dizel", "benzin", "elektrik", "lpg", "hibrit"];
export const OWNER_TYPES: OwnerType[] = ["bireysel", "kurumsal"];
export const CONDITIONS: ListingCondition[] = ["sifir", "ikinci_el"];
export const TRANSPORT_FILTERS: TransportFilter[] = ["var", "yok"];

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

/** İlan videosu — next.config.ts serverActions.bodySizeLimit ("30mb") ile uyumlu olmalı. */
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"];
