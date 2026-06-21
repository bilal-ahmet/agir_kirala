import { activeListings } from "./data/listings";
import { getUser } from "./data/users";
import { primaryPrice } from "./format";
import { RESULTS_PER_PAGE } from "./constants";
import { getCategory } from "./categories";
import type {
  FilterState,
  Listing,
  OwnerType,
  RentalPeriod,
  SortKey,
  TransportOption,
} from "./types";

type RawParams = Record<string, string | string[] | undefined>;

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

/** searchParams nesnesini FilterState'e çevirir. */
export function parseFilters(params: RawParams): FilterState {
  const specs: Record<string, number | string> = {};
  for (const [key, value] of Object.entries(params)) {
    if (key.startsWith("spec_")) {
      const s = str(value);
      if (s == null || s === "") continue;
      const n = Number(s);
      specs[key.slice(5)] = Number.isFinite(n) ? n : s;
    }
  }

  const markaRaw = str(params.marka);

  return {
    q: str(params.q),
    kategori: str(params.kategori),
    altKategori: str(params.altKategori),
    marka: markaRaw ? markaRaw.split(",").filter(Boolean) : undefined,
    il: str(params.il),
    ilce: str(params.ilce),
    periyot: str(params.periyot) as RentalPeriod | undefined,
    minFiyat: int(params.minFiyat),
    maxFiyat: int(params.maxFiyat),
    minYil: int(params.minYil),
    maxYil: int(params.maxYil),
    operator: str(params.operator) as FilterState["operator"],
    nakliye: str(params.nakliye) as TransportOption | undefined,
    saticiTipi: str(params.saticiTipi) as OwnerType | undefined,
    dogrulanmis: str(params.dogrulanmis) === "1" ? true : undefined,
    yakit: str(params.yakit) as FilterState["yakit"],
    specs: Object.keys(specs).length ? specs : undefined,
    sirala: (str(params.sirala) as SortKey) || "onerilen",
    sayfa: int(params.sayfa) ?? 1,
  };
}

/** İlanın ilgili fiyatını döndürür (periyot seçiliyse o periyot, değilse ana fiyat). */
function relevantPrice(listing: Listing, period?: RentalPeriod): number | undefined {
  if (period) return listing.prices[period];
  return primaryPrice(listing.prices)?.value;
}

function matches(listing: Listing, f: FilterState): boolean {
  const owner = getUser(listing.ownerId);

  if (f.q) {
    const hay = `${listing.title} ${listing.brand} ${listing.model}`.toLocaleLowerCase("tr");
    if (!hay.includes(f.q.toLocaleLowerCase("tr"))) return false;
  }
  if (f.kategori && listing.categorySlug !== f.kategori) return false;
  if (f.altKategori && listing.subCategorySlug !== f.altKategori) return false;
  if (f.marka && f.marka.length && !f.marka.includes(listing.brand)) return false;
  if (f.il && listing.city !== f.il) return false;
  if (f.ilce && listing.district !== f.ilce) return false;
  if (f.periyot && listing.prices[f.periyot] == null) return false;

  const price = relevantPrice(listing, f.periyot);
  if (f.minFiyat != null && (price == null || price < f.minFiyat)) return false;
  if (f.maxFiyat != null && (price == null || price > f.maxFiyat)) return false;

  if (f.minYil != null && listing.year < f.minYil) return false;
  if (f.maxYil != null && listing.year > f.maxYil) return false;

  if (f.operator === "operatorlu" && !listing.operator) return false;
  if (f.operator === "operatorsuz" && listing.operator) return false;

  if (f.nakliye && listing.transport !== f.nakliye) return false;
  if (f.yakit && listing.fuel !== f.yakit) return false;

  if (f.saticiTipi && owner?.type !== f.saticiTipi) return false;
  if (f.dogrulanmis && !owner?.verified) return false;

  if (f.specs) {
    for (const [key, cond] of Object.entries(f.specs)) {
      const value = listing.specs[key];
      if (typeof cond === "number") {
        if (typeof value !== "number" || value < cond) return false;
      } else if (String(value) !== cond) {
        return false;
      }
    }
  }
  return true;
}

function sortListings(listings: Listing[], sort: SortKey, period?: RentalPeriod): Listing[] {
  const arr = [...listings];
  switch (sort) {
    case "yeni":
      return arr.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    case "fiyat-artan":
      return arr.sort(
        (a, b) => (relevantPrice(a, period) ?? Infinity) - (relevantPrice(b, period) ?? Infinity),
      );
    case "fiyat-azalan":
      return arr.sort(
        (a, b) => (relevantPrice(b, period) ?? 0) - (relevantPrice(a, period) ?? 0),
      );
    case "yil-yeni":
      return arr.sort((a, b) => b.year - a.year);
    case "kullanim-az":
      return arr.sort((a, b) => a.usage - b.usage);
    case "puan":
      return arr.sort(
        (a, b) => (getUser(b.ownerId)?.rating ?? 0) - (getUser(a.ownerId)?.rating ?? 0),
      );
    case "onerilen":
    default:
      return arr.sort((a, b) => {
        if (!!b.featured !== !!a.featured) return b.featured ? 1 : -1;
        return +new Date(b.createdAt) - +new Date(a.createdAt);
      });
  }
}

export interface SearchResult {
  results: Listing[];
  total: number;
  page: number;
  totalPages: number;
}

/** Aktif ilanları filtreler, sıralar ve sayfalar. */
export function searchListings(f: FilterState): SearchResult {
  const filtered = activeListings().filter((l) => matches(l, f));
  const sorted = sortListings(filtered, f.sirala ?? "onerilen", f.periyot);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / RESULTS_PER_PAGE));
  const page = Math.min(Math.max(f.sayfa ?? 1, 1), totalPages);
  const start = (page - 1) * RESULTS_PER_PAGE;
  const results = sorted.slice(start, start + RESULTS_PER_PAGE);

  return { results, total, page, totalPages };
}

/** Bir kategori altında kaç aktif ilan var (kategori grid sayaçları için). */
export function countByCategory(categorySlug: string): number {
  return activeListings().filter((l) => l.categorySlug === categorySlug).length;
}

/** Aktif filtre sayısı (rozet için). q ve sirala sayılmaz. */
export function activeFilterCount(f: FilterState): number {
  let n = 0;
  if (f.altKategori) n++;
  if (f.marka?.length) n += f.marka.length;
  if (f.il) n++;
  if (f.ilce) n++;
  if (f.periyot) n++;
  if (f.minFiyat != null || f.maxFiyat != null) n++;
  if (f.minYil != null || f.maxYil != null) n++;
  if (f.operator) n++;
  if (f.nakliye) n++;
  if (f.saticiTipi) n++;
  if (f.dogrulanmis) n++;
  if (f.yakit) n++;
  if (f.specs) n += Object.keys(f.specs).length;
  return n;
}

/** Benzer ilanlar — aynı kategori, kendisi hariç. */
export function similarListings(listing: Listing, limit = 4): Listing[] {
  return activeListings()
    .filter((l) => l.id !== listing.id && l.categorySlug === listing.categorySlug)
    .slice(0, limit);
}

/** Kategori adını güvenli döndür (chip etiketi vb.) */
export function categoryName(slug: string | undefined): string | undefined {
  return getCategory(slug)?.name;
}
