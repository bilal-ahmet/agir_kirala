/**
 * Çoklu seçimli filtrelerde bağımlı parametrelerin budanması.
 * Budanmayan bir alt seçim görünmez olur ama sonucu sessizce daraltır.
 */

import { describe, expect, it } from "vitest";
import {
  clearAndPrune,
  pruneDependents,
  selectedDistricts,
  specFieldsForSelection,
  toggleAndPrune,
  toggleDistrict,
} from "@/lib/filter-selection";
import { districtsByProvince } from "@/lib/locations";
import { brandsForSelection } from "@/lib/brands";
import { getCategory } from "@/lib/categories";

const qs = (s: string) => new URLSearchParams(s);

describe("kategori / alt kategori", () => {
  it("kategori kaldırılınca ona ait alt kategoriler gider, diğerleri kalır", () => {
    const p = qs("kategori=hafriyat,forklift&altKategori=paletli-ekskavator,dizel");
    toggleAndPrune(p, "kategori", "hafriyat");
    expect(p.get("kategori")).toBe("forklift");
    expect(p.get("altKategori")).toBe("dizel");
  });

  it("kategorisi seçili olmayan alt kategori atılır", () => {
    const p = qs("altKategori=paletli-ekskavator");
    pruneDependents(p);
    expect(p.has("altKategori")).toBe(false);
  });

  it("teknik özellikler yalnız tek kategoride; ikinci kategori eklenince silinir", () => {
    const field = specFieldsForSelection(["hafriyat"], [])[0];
    expect(field).toBeDefined();
    const p = qs(`kategori=hafriyat&spec_${field.key}=1`);
    toggleAndPrune(p, "kategori", "forklift");
    expect(p.has(`spec_${field.key}`)).toBe(false);
  });

  it("yeni seçimde olmayan markalar budanır, ortak olanlar kalır", () => {
    const p = qs("kategori=hafriyat,forklift&marka=Hidromek,Toyota,Caterpillar");
    toggleAndPrune(p, "kategori", "forklift");
    expect(p.get("marka")?.split(",").sort()).toEqual(["Caterpillar", "Hidromek"]);
  });

  it("alt kategori değişince de marka budanır", () => {
    const p = qs("kategori=forklift&marka=Scania");
    toggleAndPrune(p, "altKategori", "dizel");
    expect(p.has("marka")).toBe(false);
  });
});

describe("marka yalnız kategori/alt kategori değişince budanır", () => {
  it("il kaldırılınca listede olmayan marka korunur (\"Scania forklift\")", () => {
    const p = qs("kategori=forklift&marka=Scania&il=İstanbul");
    toggleAndPrune(p, "il", "İstanbul");
    expect(p.get("marka")).toBe("Scania");
    expect(p.has("il")).toBe(false);
  });

  it("il temizlenince de marka korunur", () => {
    const p = qs("kategori=forklift&marka=Scania&il=İstanbul,Ankara");
    clearAndPrune(p, "il");
    expect(p.get("marka")).toBe("Scania");
  });

  it("değişen parametre verilmezse (sesli arama, link) yapısal budama yapılır, marka kalır", () => {
    const p = qs("kategori=forklift&altKategori=beko-loder&marka=Scania&il=Ankara&ilce=Kadıköy");
    pruneDependents(p);
    expect(p.has("altKategori")).toBe(false);
    expect(p.has("ilce")).toBe(false);
    expect(p.get("marka")).toBe("Scania");
  });

  it("il değişince kategori bağımlılarına dokunulmaz", () => {
    const field = specFieldsForSelection(["hafriyat"], [])[0];
    const p = qs(`kategori=hafriyat&spec_${field.key}=1&nakliye=var`);
    toggleAndPrune(p, "il", "Ankara");
    expect(p.get(`spec_${field.key}`)).toBe("1");
    expect(p.get("nakliye")).toBe("var");
  });
});

describe("il / ilçe", () => {
  it("ikinci il eklenince ilçe korunur ve İl/İlçe biçimine çevrilir", () => {
    const p = qs("il=İstanbul&ilce=Kadıköy");
    toggleAndPrune(p, "il", "Ankara");
    expect(p.get("il")).toBe("İstanbul,Ankara");
    expect(p.get("ilce")).toBe("İstanbul/Kadıköy");
  });

  it("il kaldırılınca yalnız o ilin ilçeleri gider", () => {
    const p = qs("il=İstanbul,Ankara&ilce=İstanbul/Kadıköy,Ankara/Çankaya");
    toggleAndPrune(p, "il", "Ankara");
    expect(p.get("ilce")).toBe("İstanbul/Kadıköy");
  });

  it("aynı adlı ilçe yalnız seçildiği ile uygulanır", () => {
    // "Merkez" onlarca ilde var; kapsamlı değer belirsizliği çözer.
    const byIl = districtsByProvince(["Adıyaman", "Ağrı"], ["Adıyaman/Merkez"]);
    expect(byIl.get("Adıyaman")).toEqual(["Merkez"]);
    expect(byIl.has("Ağrı")).toBe(false);
  });

  it("yalın ad (sesli arama / eski link) onu içeren her seçili ile gider", () => {
    const byIl = districtsByProvince(["Adıyaman", "Ağrı", "İstanbul"], ["Merkez"]);
    expect(byIl.get("Adıyaman")).toEqual(["Merkez"]);
    expect(byIl.get("Ağrı")).toEqual(["Merkez"]);
    expect(byIl.has("İstanbul")).toBe(false);
  });

  it("yalın ad normalleştirilip tek tek kaldırılabilir", () => {
    const p = qs("il=İstanbul&ilce=Kadıköy,Üsküdar");
    expect(selectedDistricts(p)).toEqual(["İstanbul/Kadıköy", "İstanbul/Üsküdar"]);
    toggleDistrict(p, "İstanbul/Kadıköy");
    expect(p.get("ilce")).toBe("İstanbul/Üsküdar");
  });

  it("il yoksa ilçe kalmaz", () => {
    const p = qs("il=İstanbul&ilce=İstanbul/Kadıköy");
    toggleAndPrune(p, "il", "İstanbul");
    expect(p.has("ilce")).toBe(false);
  });
});

describe("marka listesi", () => {
  it("hiyerarşik birleşim: kategoride seçili alt kategori varsa yalnız o", () => {
    const sub = getCategory("hafriyat")!.subcategories[0].slug;
    const brands = brandsForSelection(["hafriyat", "forklift"], [sub]);
    expect(brands).toEqual(expect.arrayContaining(brandsForSelection(["forklift"], [])));
    expect(brands).toEqual(expect.arrayContaining(brandsForSelection(["hafriyat"], [sub])));
    expect(brands).toEqual([...brands].sort((a, b) => a.localeCompare(b, "tr")));
  });
});
