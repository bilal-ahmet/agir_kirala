import type {
  FuelType,
  ListingCondition,
  OperatorFilter,
  RentalPeriod,
  SortKey,
  TransportFilter,
} from "../../types";

/**
 * Sesli aramadan çıkan filtreler. Alanlar /ilanlar URL parametreleriyle
 * (src/lib/filter-params.ts) birebir aynı anlama sahiptir.
 */
export interface VoiceFilters {
  q?: string;
  kategori?: string;
  altKategori?: string;
  il?: string;
  ilce?: string;
  marka: string[];
  periyot: RentalPeriod[];
  operator?: OperatorFilter;
  nakliye?: TransportFilter;
  durum?: ListingCondition;
  yakit: FuelType[];
  minFiyat?: number;
  maxFiyat?: number;
  minYil?: number;
  sirala?: SortKey;
  /** Kategoriye özel sayısal eşikler: spec_<anahtar>=<değer> (minimum). */
  specs: Record<string, number>;
}

export function emptyFilters(): VoiceFilters {
  return { marka: [], periyot: [], yakit: [], specs: {} };
}

/** Kullanıcıya "şunu anladım" diye gösterilen, tek tek kaldırılabilen parça. */
export interface VoiceChip {
  /** URL parametresi adı (ör. "il", "marka"). */
  param: string;
  /** Parametre değeri; çoklu parametrelerde (marka, periyot) tek bir öğe. */
  value: string;
  /** Türkçe görünen ad. */
  label: string;
}

export interface VoiceParseResult {
  /** Normalleştirilmiş konuşma metni (boşlukları temizlenmiş). */
  text: string;
  /** /ilanlar ve GET /api/v1/listings için hazır sorgu parametreleri. */
  params: Record<string, string>;
  chips: VoiceChip[];
  /** Hiçbir filtreye dönüşmeyen kelimeler (bilgi amaçlı). */
  remainder: string;
  /** Sonucu kim üretti: yalnız kurallar mı, LLM yedeği de mi. */
  source: "rules" | "llm";
}
