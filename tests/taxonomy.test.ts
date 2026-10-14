/**
 * Taksonomi, tır kategorisi, sefer fiyatı ve nakliye önerisi kuralları.
 *
 * Taksonomi tek kaynaktan filtre paneline, ilan formuna, /api/v1/meta'ya ve
 * sesli aramaya akıyor. Buradaki tutarsızlıklar sessizdir: yanlış yazılmış bir
 * alt kategori slug'ı hata vermez, o alan hiçbir yerde görünmez.
 */

import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  getCategory,
  getFilterableSpecFields,
  needsHauling,
  operatorLabel,
  specFieldsFor,
  transportApplies,
} from "@/lib/categories";
import { ALL_BRANDS, SUBCATEGORY_BRANDS, brandsForSubcategory, isTurkishBrand } from "@/lib/brands";
import { TRAILER_BRANDS, TRUCK_BRANDS } from "@/lib/truck-brands";
import { parseFilters } from "@/lib/filter-params";
import { computeRentalTotal, publishPriceError, quantityFor } from "@/lib/pricing";
import { PERIODS, PRIMARY_PRICE_ORDER } from "@/lib/constants";
import { primaryPrice } from "@/lib/format";
import { haulingPlan, LOWBED_ONLY_ABOVE_TON } from "@/lib/hauling";
import { buildOpenApiDocument } from "@/lib/api/openapi";
import { LISTINGS } from "@/lib/data/listings";
import type { Listing } from "@/lib/types";

const allSubSlugs = new Set(CATEGORIES.flatMap((c) => c.subcategories.map((s) => s.slug)));

describe("taksonomi tutarlılığı", () => {
  it("her marka listesi gerçek bir alt kategoriye ait", () => {
    for (const key of Object.keys(SUBCATEGORY_BRANDS)) expect(allSubSlugs.has(key), key).toBe(true);
  });

  it("marka listelerinde tekrar yok", () => {
    for (const [key, list] of Object.entries(SUBCATEGORY_BRANDS)) {
      expect(new Set(list).size, key).toBe(list.length);
    }
  });

  it("spec alanlarının alt kategori kısıtları kendi kategorisinde var", () => {
    for (const c of CATEGORIES) {
      const subs = new Set(c.subcategories.map((s) => s.slug));
      for (const f of c.specFields) {
        for (const s of f.subcategories ?? []) expect(subs.has(s), `${c.slug}.${f.key} → ${s}`).toBe(true);
      }
    }
  });

  it("filtrelenebilir sayı alanlarının kademesi, seçim alanlarının seçeneği var", () => {
    for (const c of CATEGORIES) {
      for (const f of c.specFields.filter((x) => x.filterable)) {
        if (f.type === "number") expect(f.steps?.length, `${c.slug}.${f.key}`).toBeGreaterThan(0);
        if (f.type === "select") expect(f.options?.length, `${c.slug}.${f.key}`).toBeGreaterThan(0);
      }
    }
  });

  it("alan anahtarları kategori içinde tekil", () => {
    for (const c of CATEGORIES) {
      const keys = c.specFields.map((f) => f.key);
      expect(new Set(keys).size, c.slug).toBe(keys.length);
    }
  });

  it("lowbed artık damperli kamyonda değil, tırda", () => {
    expect(getCategory("damperli-kamyon")?.subcategories.some((s) => s.slug.includes("lowbed"))).toBe(false);
    expect(getCategory("tir")?.subcategories.some((s) => s.slug === "lowbed")).toBe(true);
    expect(SUBCATEGORY_BRANDS["lowbed-cekici"]).toBeUndefined();
  });

  it("demo ilanların kategori ve alt kategorisi geçerli", () => {
    for (const l of LISTINGS) {
      const c = getCategory(l.categorySlug);
      expect(c, l.id).toBeDefined();
      expect(c!.subcategories.some((s) => s.slug === l.subCategorySlug), `${l.id} ${l.subCategorySlug}`).toBe(true);
    }
  });

  it("demo tır ilanlarının spec anahtarları o alt kategoride tanımlı", () => {
    for (const l of LISTINGS.filter((x) => x.categorySlug === "tir")) {
      const keys = new Set(specFieldsFor("tir", l.subCategorySlug).map((f) => f.key));
      for (const k of Object.keys(l.specs)) expect(keys.has(k), `${l.id}.${k}`).toBe(true);
    }
  });
});

describe("tır markaları", () => {
  it("çekici alt kategorisi yalnız çekici markaları", () => {
    expect(SUBCATEGORY_BRANDS.cekici).toEqual([...TRUCK_BRANDS]);
  });

  it("dorseli tiplerde önce çekici, sonra dorse markaları; yerliler başta", () => {
    const lowbed = brandsForSubcategory("tir", "lowbed");
    expect(lowbed).toEqual(expect.arrayContaining(["Mercedes-Benz", "Nooteboom", "Goldhofer", "Tırsan", "Gürleşenyıl"]));
    // orderBrands yerlileri başa alır
    const firstForeign = lowbed.findIndex((b) => !isTurkishBrand(b));
    expect(lowbed.slice(firstForeign).some(isTurkishBrand)).toBe(false);
  });

  it("dorse markaları tüm marka listesinde ve dorse markası seçeneğinde", () => {
    for (const b of TRAILER_BRANDS.filter((x) => Object.values(SUBCATEGORY_BRANDS).flat().includes(x))) {
      expect(ALL_BRANDS).toContain(b);
    }
    const field = getCategory("tir")!.specFields.find((f) => f.key === "dorseMarkasi")!;
    expect(field.options).toEqual(expect.arrayContaining([...TRAILER_BRANDS, "Diğer"]));
  });

  it("yerli dorse üreticileri Yerli rozeti alır", () => {
    for (const b of ["Tırsan", "Özgül", "Nursan", "Gürleşenyıl", "Koluman"]) expect(isTurkishBrand(b), b).toBe(true);
  });
});

describe("alt kategoriye özel alanlar", () => {
  it("alt kategori seçilmemişse yalnız ortak alanlar", () => {
    const keys = specFieldsFor("tir").map((f) => f.key);
    expect(keys).toContain("kiralamaKapsami");
    expect(keys).not.toContain("rampaTipi");
    expect(keys).not.toContain("tasimaKapasitesi");
  });

  it("lowbed kendi alanlarını görür, tenteliyi görmez", () => {
    const keys = specFieldsFor("tir", "lowbed").map((f) => f.key);
    expect(keys).toEqual(expect.arrayContaining(["rampaTipi", "lowbedTipi", "tasimaKapasitesi", "dorseMarkasi"]));
    expect(keys).not.toContain("paletKapasitesi");
  });

  it("çekicide dorse alanı yok", () => {
    const keys = specFieldsFor("tir", "cekici").map((f) => f.key);
    expect(keys).not.toContain("dorseMarkasi");
    expect(keys).not.toContain("tasimaKapasitesi");
  });

  it("filtre paneli alt kategoriye göre daralır", () => {
    expect(getFilterableSpecFields("tir", "frigorifik").map((f) => f.key)).toContain("sogutmaTipi");
    expect(getFilterableSpecFields("tir", "lowbed").map((f) => f.key)).not.toContain("sogutmaTipi");
  });

  it("diğer kategoriler değişmedi (kısıtsız alanlar her alt kategoride)", () => {
    expect(specFieldsFor("hafriyat", "beko-loder")).toEqual(getCategory("hafriyat")!.specFields);
  });

  it("boolean filtre parametresi aramada eşleşir", () => {
    expect(parseFilters({ spec_adr: "true" }).specs).toEqual({ adr: "true" });
  });
});

describe("kategori etiketleri", () => {
  it("tırda şoför, makinede operatör", () => {
    expect(operatorLabel("tir", true)).toBe("Şoförlü");
    expect(operatorLabel("tir", false)).toBe("Şoförsüz");
    expect(operatorLabel("hafriyat", true)).toBe("Operatörlü");
    expect(operatorLabel(undefined, false)).toBe("Operatörsüz");
  });

  it("nakliye alanı tırda yok", () => {
    expect(transportApplies("tir")).toBe(false);
    expect(transportApplies("hafriyat")).toBe(true);
    expect(transportApplies(undefined)).toBe(true);
  });
});

describe("sefer başı fiyat", () => {
  it("arama parametresi ve OpenAPI enum'u", () => {
    expect(parseFilters({ periyot: "sefer,gunluk" }).periyot).toEqual(["sefer", "gunluk"]);
    const doc = JSON.stringify(buildOpenApiDocument());
    expect(doc).toContain('"sefer"');
  });

  it("bir talep tek sefer; saat ek ücreti uygulanmaz", () => {
    expect(quantityFor("sefer", 3)).toBe(1);
    const c = computeRentalTotal({ sefer: 10000, saatlik: 500 }, "sefer", "2026-10-01", "2026-10-03", "08:00", "12:00");
    expect(c).toMatchObject({ qty: 1, base: 10000, hourAddon: 0, total: 10000 });
  });

  it("ana fiyat sırası her periyodu tam bir kez içerir", () => {
    // Aramadaki varsayılan fiyat ifadesi de bu sabitten üretilir; eksik bir
    // periyot o ilanı fiyat sıralamasında NULL'a düşürürdü.
    expect([...PRIMARY_PRICE_ORDER].sort()).toEqual(PERIODS.map((p) => p.value).sort());
  });

  it("kartta sefer fiyatı önce gelir (sıralama ve filtreyle aynı fiyat)", () => {
    expect(primaryPrice({ sefer: 9000, gunluk: 12000 })).toEqual({ value: 9000, period: "sefer" });
    expect(primaryPrice({ gunluk: 12000, saatlik: 1500 })).toEqual({ value: 12000, period: "gunluk" });
    expect(primaryPrice({ aylik: 200000 })).toEqual({ value: 200000, period: "aylik" });
    expect(primaryPrice({})).toBeNull();
  });

  it("yayın kuralı: makinede saatlik zorunlu, tırda en az bir fiyat", () => {
    expect(publishPriceError("hafriyat", { gunluk: 1000 })).toMatch(/saatlik/);
    expect(publishPriceError("hafriyat", { saatlik: 100 })).toBeNull();
    expect(publishPriceError("tir", {})).toMatch(/en az bir fiyat/);
    expect(publishPriceError("tir", { sefer: 9000 })).toBeNull();
  });
});

// ───────── Nakliye önerisi ─────────

const machine = (over: Partial<Listing> = {}) =>
  ({
    categorySlug: "hafriyat",
    subCategorySlug: "paletli-ekskavator",
    specs: { operasyonAgirligi: 22 },
    city: "Kocaeli",
    transport: "yok",
    ...over,
  }) as Pick<Listing, "categorySlug" | "subCategorySlug" | "specs" | "city" | "transport">;

describe("nakliye önerisi kuralları", () => {
  it("ekskavatör: lowbed + açık kasa, kapasite ≥ ağırlık, aynı il öncelikli", () => {
    expect(haulingPlan(machine())).toEqual({
      subcategories: ["lowbed", "acik-kasa"],
      minCapacity: 22,
      preferCity: "Kocaeli",
      searchParams: { kategori: "tir", altKategori: "lowbed", spec_tasimaKapasitesi: "22" },
    });
  });

  it(`${LOWBED_ONLY_ABOVE_TON} tonun üstünde yalnız lowbed; kesirli ağırlık yukarı yuvarlanır`, () => {
    const plan = haulingPlan(machine({ specs: { operasyonAgirligi: 30.4 } }));
    expect(plan?.subcategories).toEqual(["lowbed"]);
    expect(plan?.minCapacity).toBe(31);
  });

  it("ağırlık bilinmiyorsa kapasite şartı yok", () => {
    const plan = haulingPlan(machine({ categorySlug: "forklift", subCategorySlug: "dizel", specs: {} }));
    expect(plan?.minCapacity).toBeUndefined();
    expect(plan?.searchParams).toEqual({ kategori: "tir", altKategori: "lowbed" });
  });

  it("öneri anlamsızsa plan yok", () => {
    // Tırın kendisi, damperli kamyon
    expect(haulingPlan(machine({ categorySlug: "tir", subCategorySlug: "lowbed" }))).toBeNull();
    expect(haulingPlan(machine({ categorySlug: "damperli-kamyon", subCategorySlug: "kirkayak" }))).toBeNull();
    // Kendi yola çıkan makine
    expect(haulingPlan(machine({ categorySlug: "vinc-platform", subCategorySlug: "mobil-vinc" }))).toBeNull();
    expect(haulingPlan(machine({ categorySlug: "beton", subCategorySlug: "beton-mikseri" }))).toBeNull();
    // Nakliye zaten fiyata dahil
    expect(haulingPlan(machine({ transport: "dahil" }))).toBeNull();
    // Nakliye ücretli ekstra ise öneri yine gösterilir
    expect(haulingPlan(machine({ transport: "ekstra" }))).not.toBeNull();
  });

  it("needsHauling: kategori bayrağı + selfDriving", () => {
    expect(needsHauling("vinc-platform", "kule-vinc")).toBe(true);
    expect(needsHauling("vinc-platform", "hiyap-vinc")).toBe(false);
    expect(needsHauling("jenerator", "kabinli-dizel")).toBe(true);
  });
});
