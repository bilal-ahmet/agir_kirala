import type {
  FuelType,
  ListingCondition,
  OperatorFilter,
  RentalPeriod,
  SortKey,
  TransportFilter,
} from "../../types";

/** Çoklu seçilebilen, eklenip çıkarılabilen boyutlar. */
export const LIST_KEYS = ["kategori", "altKategori", "il", "ilce", "marka"] as const;
export type ListKey = (typeof LIST_KEYS)[number];

/**
 * Sesli aramadan çıkan filtreler. Alanlar /ilanlar URL parametreleriyle
 * (src/lib/filter-params.ts) birebir aynı anlama sahiptir; diziler URL'de
 * virgülle birleşir.
 */
export interface VoiceFilters {
  q?: string;
  kategori: string[];
  /** Alt kategori slug'ları (77 slug tekil; kategorisi slug'dan bulunur). */
  altKategori: string[];
  il: string[];
  /** "İl/İlçe" biçiminde (bkz. locations.ts → scopedDistrict). */
  ilce: string[];
  marka: string[];
  periyot: RentalPeriod[];
  operator?: OperatorFilter;
  nakliye?: TransportFilter;
  durum?: ListingCondition;
  yakit: FuelType[];
  minFiyat?: number;
  maxFiyat?: number;
  minYil?: number;
  maxYil?: number;
  sirala?: SortKey;
  /**
   * Kategoriye özel teknik filtreler: sayı → "en az" eşiği
   * (spec_<anahtar>=20), dizi → seçeneklerden herhangi biri (spec_euroNorm=Euro 6).
   */
  specs: Record<string, number | string[]>;
  /**
   * Olumsuzlanan ya da "çıkar/kaldır" denen değerler ("JCB olmasın",
   * "Ankara'yı çıkar"). Aramada hariç tutma filtresi yok: yeni aramada yok
   * sayılır, mevcut filtreleri düzenlerken o değerler listeden çıkarılır.
   * İlçe burada yalın ad olabilir (hangi il olduğu mevcut filtrelerden belli).
   */
  removed: Record<ListKey, string[]>;
}

export function emptyFilters(): VoiceFilters {
  return {
    kategori: [],
    altKategori: [],
    il: [],
    ilce: [],
    marka: [],
    periyot: [],
    yakit: [],
    specs: {},
    removed: { kategori: [], altKategori: [], il: [], ilce: [], marka: [] },
  };
}

/** Kullanıcıya "şunu anladım" diye gösterilen, tek tek kaldırılabilen parça. */
export interface VoiceChip {
  /** URL parametresi adı (ör. "il", "marka"). */
  param: string;
  /** Parametre değeri; çoklu parametrelerde (marka, il…) tek bir öğe. */
  value: string;
  /** Türkçe görünen ad. */
  label: string;
}

export interface VoiceParseResult {
  /** Normalleştirilmiş konuşma metni (boşlukları temizlenmiş). */
  text: string;
  /** /ilanlar ve GET /api/v1/listings için hazır sorgu parametreleri (tam küme). */
  params: Record<string, string>;
  chips: VoiceChip[];
  /** Hiçbir filtreye dönüşmeyen kelimeler (bilgi amaçlı). */
  remainder: string;
  /** Sonucu kim üretti: yalnız kurallar mı, LLM yedeği de mi. */
  source: "rules" | "llm";
  /**
   * "new": yeni arama. "refine": istekte gönderilen mevcut filtreler
   * düzenlendi ("Kocaeli'yi de ekle", "JCB'yi çıkar"); params yine TAM kümedir.
   */
  mode: "new" | "refine";
  /** Yalnız refine'da: mevcut filtrelere göre eklenen ve çıkarılan parçalar. */
  changes?: { added: VoiceChip[]; removed: VoiceChip[] };
}
