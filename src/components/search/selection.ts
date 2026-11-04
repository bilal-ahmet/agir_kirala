// Çoklu seçimli filtrelerin birbirine bağımlılıkları (istemci tarafı).
//
// Kategori / alt kategori / il / ilçe / marka / teknik özellik seçimleri
// birbirini daraltır. Bir üst seçim değişince ALTINDA artık anlamsız kalan
// değerler URL'den budanır; aksi halde görünmeyen bir filtre sonucu sessizce
// daraltırdı (ör. kategoriden çıkarılan bir alt kategori).

import type { SpecField } from "@/lib/types";
import { getCategory, getFilterableSpecFields, transportApplies } from "@/lib/categories";
import { brandsForSelection } from "@/lib/brands";
import { districtsOf } from "@/lib/locations";

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
 * Bağımlı parametreleri budar. Kategori, alt kategori veya il değiştikten
 * sonra çağrılır (aynı mutator içinde).
 */
export function pruneDependents(p: URLSearchParams) {
  const cats = listOf(p, "kategori");

  // Alt kategori: yalnız seçili kategorilere ait olanlar.
  const ownSubs = new Set(cats.flatMap((c) => getCategory(c)?.subcategories.map((s) => s.slug) ?? []));
  const subs = listOf(p, "altKategori").filter((s) => ownSubs.has(s));
  setList(p, "altKategori", subs);

  // İlçe: yalnız TEK il seçiliyken ve o ile ait olanlar.
  const iller = listOf(p, "il");
  const districts = iller.length === 1 ? new Set(districtsOf(iller[0])) : new Set<string>();
  setList(p, "ilce", listOf(p, "ilce").filter((d) => districts.has(d)));

  // Marka: yeni seçimin marka listesinde kalanlar.
  const brands = new Set(brandsForSelection(cats, subs));
  setList(p, "marka", listOf(p, "marka").filter((b) => brands.has(b)));

  // Teknik özellikler: yalnız hâlâ gösterilen alanlar.
  const valid = new Set(specFieldsForSelection(cats, subs).map((f) => `spec_${f.key}`));
  [...p.keys()].filter((k) => k.startsWith("spec_") && !valid.has(k)).forEach((k) => p.delete(k));

  // Nakliye: hiçbir seçili kategoride anlamlı değilse.
  if (!transportAppliesToSelection(cats)) p.delete("nakliye");
}

/** Listede değeri aç/kapat, ardından bağımlıları buda. */
export function toggleAndPrune(p: URLSearchParams, key: string, value: string) {
  const cur = listOf(p, key);
  setList(p, key, cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value]);
  pruneDependents(p);
}

/** Parametreyi tamamen temizle, ardından bağımlıları buda. */
export function clearAndPrune(p: URLSearchParams, key: string) {
  p.delete(key);
  pruneDependents(p);
}
