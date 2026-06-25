// Marka listeleri. Filtre + ilan ekleme formunda kullanılır.

export const MACHINE_BRANDS = [
  "Caterpillar",
  "Komatsu",
  "Hitachi",
  "JCB",
  "Volvo",
  "Hidromek",
  "Liebherr",
  "Doosan",
  "Hyundai",
  "Case",
  "New Holland",
  "Kobelco",
  "Bobcat",
  "Manitou",
  "Çukurova",
  "Terex",
];

export const VEHICLE_BRANDS = [
  "Mercedes-Benz",
  "MAN",
  "Scania",
  "Volvo",
  "DAF",
  "Iveco",
  "Ford Trucks",
  "Renault Trucks",
  "BMC",
  "Tırsan",
  "Otokar",
];

import { getCategory } from "./categories";

/** Karayolu taşıtı (kamyon) sayılan kategoriler — araç markaları gösterilir */
const VEHICLE_CATEGORY_SLUGS = new Set(["damperli-kamyon"]);

/** Kategoriye uygun marka listesini döndürür */
export function brandsForCategory(categorySlug: string | undefined): string[] {
  const cat = getCategory(categorySlug);
  if (!cat) return Array.from(new Set([...MACHINE_BRANDS, ...VEHICLE_BRANDS])).sort();
  return VEHICLE_CATEGORY_SLUGS.has(cat.slug) ? VEHICLE_BRANDS : MACHINE_BRANDS;
}

export const ALL_BRANDS = Array.from(
  new Set([...MACHINE_BRANDS, ...VEHICLE_BRANDS]),
).sort((a, b) => a.localeCompare(b, "tr"));
