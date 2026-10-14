// "Nakliye için tır" önerisinin kuralları — saf modül (DB yok, test edilebilir).
//
// İş makinesi kiralayan kişi makineyi şantiyeye taşıtmak zorunda. İlan detayında
// bu makineyi taşıyabilecek tır ilanları önerilir. Hangi tırların uygun olduğu
// burada, tek yerde karar verilir; sorgu (db/queries/listings.ts → haulingListings)
// ve web/mobil taşıma katmanları yalnız bu planı uygular.

import { needsHauling } from "./categories";
import type { Listing } from "./types";

/** Makine taşımaya uygun tır tipleri. Diğerleri (tenteli, tanker…) iş makinesi taşımaz. */
export type HaulingSubcategory = "lowbed" | "acik-kasa";

/**
 * Bu ağırlığın üstünde yalnız lowbed: açık kasa (sal) dorselerin taşıma
 * kapasitesi ve yük yüksekliği ağır makineye yetmez.
 */
export const LOWBED_ONLY_ABOVE_TON = 25;

export interface HaulingPlan {
  subcategories: HaulingSubcategory[];
  /** Makinenin operasyon ağırlığı (ton) biliniyorsa en az bu kapasite. */
  minCapacity?: number;
  /** Önce bu ildeki tırlar gösterilir. */
  preferCity: string;
  /** "Tümünü gör" bağlantısı için /ilanlar parametreleri. */
  searchParams: Record<string, string>;
}

/**
 * İlan için nakliye planı. Öneri anlamsızsa null:
 * - makine kategorisi taşınma gerektirmiyorsa (tır, damperli kamyon),
 * - alt tür kendi başına yola çıkabiliyorsa (mobil vinç, transmikser…),
 * - nakliye zaten fiyata dahilse.
 */
export function haulingPlan(
  listing: Pick<Listing, "categorySlug" | "subCategorySlug" | "specs" | "city" | "transport">,
): HaulingPlan | null {
  if (!needsHauling(listing.categorySlug, listing.subCategorySlug)) return null;
  if (listing.transport === "dahil") return null;

  const raw = Number(listing.specs.operasyonAgirligi);
  const weight = Number.isFinite(raw) && raw > 0 ? Math.ceil(raw) : undefined;
  const heavy = weight !== undefined && weight > LOWBED_ONLY_ABOVE_TON;

  const searchParams: Record<string, string> = { kategori: "tir", altKategori: "lowbed" };
  if (weight !== undefined) searchParams.spec_tasimaKapasitesi = String(weight);

  return {
    subcategories: heavy ? ["lowbed"] : ["lowbed", "acik-kasa"],
    minCapacity: weight,
    preferCity: listing.city,
    searchParams,
  };
}
