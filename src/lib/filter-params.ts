// searchParams ⇄ FilterState dönüşümü.
//
// Bu modül BİLEREK saftır: hiçbir veri kaynağı (DB, mock) import etmez. İstemci
// bileşenleri (FilterPanel, ExploreSection, MobileFilterBar) bunu import ettiği
// için buraya eklenecek her veri importu doğrudan tarayıcı paketine girer.
// Gerçek arama/filtreleme sunucuda: src/lib/db/queries/listings.ts

import type {
  FilterState,
  FuelType,
  ListingCondition,
  OperatorFilter,
  OwnerType,
  RentalPeriod,
  SortKey,
  TransportFilter,
} from "./types";

export type RawParams = Record<string, string | string[] | undefined>;

function str(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v || undefined;
}

function int(v: string | string[] | undefined): number | undefined {
  const s = str(v);
  if (s == null) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Negatif değerleri sıfıra çeker (model yılı / fiyat alanları eksiye düşmemeli). */
function nonNegative(v: string | string[] | undefined): number | undefined {
  const n = int(v);
  if (n == null) return undefined;
  return n < 0 ? 0 : n;
}

/**
 * Varlık bayrağı (`fotografli=1`, `videolu=1`).
 *
 * Web "1" üretiyor; "true" da kabul edilir çünkü REST istemcileri boolean'ı
 * doğal olarak böyle serileştirir. Kabul edilmeseydi filtre HATA VERMEDEN
 * yok sayılır, istemci filtrelenmemiş sonucu doğru sanırdı — fark edilmesi
 * zor bir hata sınıfı.
 */
function flag(v: string | string[] | undefined): true | undefined {
  const s = str(v)?.toLowerCase();
  return s === "1" || s === "true" ? true : undefined;
}

/** Virgülle ayrılmış serbest çoklu değer (kategori, il, marka...). Boşsa undefined. */
function csv(v: string | string[] | undefined): string[] | undefined {
  const s = str(v);
  if (!s) return undefined;
  const out = Array.from(new Set(s.split(",").map((x) => x.trim()).filter(Boolean)));
  return out.length ? out : undefined;
}

/** Virgülle ayrılmış çoklu seçim değerini diziye çevirir (izin verilen değerlerle sınırlar). */
function list<T extends string>(
  v: string | string[] | undefined,
  allowed: readonly T[],
): T[] | undefined {
  const s = str(v);
  if (!s) return undefined;
  const out = s
    .split(",")
    .map((x) => x.trim())
    .filter((x): x is T => (allowed as readonly string[]).includes(x));
  return out.length ? out : undefined;
}

const FUELS = ["dizel", "benzin", "elektrik", "lpg", "hibrit"] as const;
const OWNER_TYPES = ["bireysel", "kurumsal"] as const;
const CONDITIONS = ["sifir", "ikinci_el"] as const;
const TRANSPORTS = ["var", "yok"] as const;
const OPERATORS = ["operatorlu", "operatorsuz"] as const;
const RENTAL_PERIODS = ["saatlik", "gunluk", "haftalik", "aylik", "yillik", "sefer"] as const;

/** searchParams nesnesini FilterState'e çevirir. */
export function parseFilters(params: RawParams): FilterState {
  const specs: Record<string, number | string[]> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith("spec_")) {
      const s = str(value)?.trim();
      if (!s) continue;
      // Sayı → "en az" eşiği; metin → virgüllü seçenek listesi (herhangi biri).
      const n = Number(s);
      if (Number.isFinite(n)) specs[key.slice(5)] = n;
      else {
        const options = csv(s);
        if (options) specs[key.slice(5)] = options;
      }
    }
  }

  return {
    q: str(params.q),
    kategori: csv(params.kategori),
    altKategori: csv(params.altKategori),
    marka: csv(params.marka),
    il: csv(params.il),
    ilce: csv(params.ilce),
    periyot: list<RentalPeriod>(params.periyot, RENTAL_PERIODS),
    minFiyat: nonNegative(params.minFiyat),
    maxFiyat: nonNegative(params.maxFiyat),
    minYil: nonNegative(params.minYil),
    maxYil: nonNegative(params.maxYil),
    operator: list<OperatorFilter>(params.operator, OPERATORS),
    nakliye: list<TransportFilter>(params.nakliye, TRANSPORTS),
    saticiTipi: list<OwnerType>(params.saticiTipi, OWNER_TYPES),
    yakit: list<FuelType>(params.yakit, FUELS),
    durum: list<ListingCondition>(params.durum, CONDITIONS),
    fotografli: flag(params.fotografli),
    videolu: flag(params.videolu),
    specs: Object.keys(specs).length ? specs : undefined,
    sirala: (str(params.sirala) as SortKey) || "onerilen",
    sayfa: int(params.sayfa) ?? 1,
  };
}

/** Aktif filtre sayısı (rozet için). q, kategori ve sirala sayılmaz. */
export function activeFilterCount(f: FilterState): number {
  let n = 0;
  if (f.altKategori?.length) n += f.altKategori.length;
  if (f.marka?.length) n += f.marka.length;
  if (f.il?.length) n += f.il.length;
  if (f.ilce?.length) n += f.ilce.length;
  if (f.periyot?.length) n += f.periyot.length;
  if (f.minFiyat != null || f.maxFiyat != null) n++;
  if (f.minYil != null || f.maxYil != null) n++;
  if (f.operator?.length) n += f.operator.length;
  if (f.nakliye?.length) n += f.nakliye.length;
  if (f.saticiTipi?.length) n += f.saticiTipi.length;
  if (f.yakit?.length) n += f.yakit.length;
  if (f.durum?.length) n += f.durum.length;
  if (f.fotografli) n++;
  if (f.videolu) n++;
  if (f.specs) {
    for (const v of Object.values(f.specs)) n += Array.isArray(v) ? v.length : 1;
  }
  return n;
}
