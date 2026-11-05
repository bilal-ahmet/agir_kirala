// Çoklu seçimli filtrelerin birbirine bağımlılıkları.
//
// Kategori / alt kategori / il / ilçe / marka / teknik özellik seçimleri
// birbirini daraltır. Bir üst seçim değişince ALTINDA artık anlamsız kalan
// değerler URL'den budanır; aksi halde görünmeyen bir filtre sonucu sessizce
// daraltırdı (ör. kategoriden çıkarılan bir alt kategori).
//
// Saf modül: filtre paneli (istemci) ve sesli arama (sunucu) aynı kuralları
// kullanır, böylece sesle kurulan bir arama panelde birebir aynı görünür.

import type { SpecField } from "@/lib/types";
import { getCategory, getFilterableSpecFields, transportApplies } from "@/lib/categories";
import { brandsForSelection } from "@/lib/brands";
import { districtsByProvince, scopedDistrict } from "@/lib/locations";

type Params = URLSearchParams | { get(key: string): string | null };

/** Virgüllü parametreyi diziye çevirir. */
export function listOf(sp: Params, key: string): string[] {
  return (sp.get(key) || "").split(",").filter(Boolean);
}

function setList(p: URLSearchParams, key: string, values: string[]) {
  if (values.length) p.set(key, values.join(","));
  else p.delete(key);
}

/**
 * Seçili ilçeler, "İl/İlçe" biçiminde ve yalnız seçili illere ait olanlar.
 * Yalın ad (sesli arama / eski link) onu içeren her seçili ile genişletilir;
 * böylece kutucuklar doğru işaretlenir ve tek tek kaldırılabilir.
 */
export function selectedDistricts(sp: Params): string[] {
  const byProvince = districtsByProvince(listOf(sp, "il"), listOf(sp, "ilce"));
  return [...byProvince].flatMap(([il, ds]) => ds.map((d) => scopedDistrict(il, d)));
}

/**
 * Teknik özellik alanları yalnız TEK kategori seçiliyken anlamlıdır (alanlar
 * kategoriye özgü). Birden çok alt kategori seçiliyse alanların birleşimi.
 */
export function specFieldsForSelection(cats: string[], subs: string[]): SpecField[] {
  if (cats.length !== 1) return [];
  const cat = cats[0];
  const own = new Set(getCategory(cat)?.subcategories.map((s) => s.slug) ?? []);
  const picked = subs.filter((s) => own.has(s));
  if (picked.length === 0) return getFilterableSpecFields(cat);
  const byKey = new Map<string, SpecField>();
  for (const s of picked) for (const f of getFilterableSpecFields(cat, s)) byKey.set(f.key, f);
  return [...byKey.values()];
}

/** Nakliye filtresi: seçim yoksa ya da seçili kategorilerden biri nakliyeye uygunsa. */
export function transportAppliesToSelection(cats: string[]): boolean {
  return cats.length === 0 || cats.some((c) => transportApplies(c));
}

/** Tüm seçili kategoriler aynı özel operatör etiketini kullanıyorsa (tır → "Şoför") o kategori. */
export function operatorLabelCategory(cats: string[]): string | undefined {
  if (cats.length === 0) return undefined;
  const all = cats.map((c) => getCategory(c));
  return all.every((c) => c?.operatorLabels) ? all[0]!.slug : undefined;
}

/**
 * Bağımlı parametreleri budar. Yalnız DEĞİŞEN üst seçime bağlı olanlara
 * dokunur (aynı mutator içinde çağrılır):
 *
 * - il → ilçe ("İl/İlçe" biçimine normalleştirilir, yalnız seçili illerden).
 * - kategori / alt kategori → alt kategori, marka, teknik özellik, nakliye.
 * - `changed` verilmezse (sesli arama, dışarıdan gelen link) yapısal budama
 *   yapılır ama marka budanmaz: söylenen/gönderilen marka kategorinin
 *   listesinde olmasa da aranır, uygun ilan yoksa sonuç sayfası bunu söyler.
 *
 * Marka listesi yalnız kategori/alt kategoriye bağlıdır; il değişince marka
 * budansaydı "Scania forklift" aramasında il çipini kaldırmak Scania'yı da
 * sessizce silerdi. Mobil uygulama da aynı kuralı uygular.
 */
export function pruneDependents(p: URLSearchParams, changed?: string) {
  const byCategory = changed === undefined || changed === "kategori" || changed === "altKategori";
  const byLocation = changed === undefined || changed === "il";

  if (byCategory) {
    const cats = listOf(p, "kategori");

    // Alt kategori: yalnız seçili kategorilere ait olanlar.
    const ownSubs = new Set(cats.flatMap((c) => getCategory(c)?.subcategories.map((s) => s.slug) ?? []));
    const subs = listOf(p, "altKategori").filter((s) => ownSubs.has(s));
    setList(p, "altKategori", subs);

    // Marka: kullanıcı kategori seçimini değiştirdiyse, yeni seçimin listesinde kalanlar.
    if (changed !== undefined) {
      const brands = new Set(brandsForSelection(cats, subs));
      setList(p, "marka", listOf(p, "marka").filter((b) => brands.has(b)));
    }

    // Teknik özellikler: yalnız hâlâ gösterilen alanlar.
    const valid = new Set(specFieldsForSelection(cats, subs).map((f) => `spec_${f.key}`));
    [...p.keys()].filter((k) => k.startsWith("spec_") && !valid.has(k)).forEach((k) => p.delete(k));

    // Nakliye: hiçbir seçili kategoride anlamlı değilse.
    if (!transportAppliesToSelection(cats)) p.delete("nakliye");
  }

  // İlçe: yalnız seçili illere ait olanlar, "İl/İlçe" biçimine normalleştirilmiş.
  if (byLocation) setList(p, "ilce", selectedDistricts(p));
}

/** Listede değeri aç/kapat, ardından o parametreye bağlı olanları buda. */
export function toggleAndPrune(p: URLSearchParams, key: string, value: string) {
  const cur = listOf(p, key);
  setList(p, key, cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]);
  pruneDependents(p, key);
}

/** İlçe aç/kapat ("İl/İlçe"). Önce yalın adlar normalleştirilir ki kaldırma çalışsın. */
export function toggleDistrict(p: URLSearchParams, scoped: string) {
  const cur = selectedDistricts(p);
  setList(p, "ilce", cur.includes(scoped) ? cur.filter((v) => v !== scoped) : [...cur, scoped]);
}

/** Parametreyi tamamen temizle, ardından o parametreye bağlı olanları buda. */
export function clearAndPrune(p: URLSearchParams, key: string) {
  p.delete(key);
  pruneDependents(p, key);
}
