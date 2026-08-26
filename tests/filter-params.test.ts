/**
 * parseFilters sözleşme testleri.
 *
 * Bu modül hem web hem /api/v1 arama ucunu besliyor; OpenAPI'de ilan edilen her
 * sorgu parametresi burada gerçekten ayrıştırılabilmeli. Uyumsuzluk sessizdir:
 * tanınmayan bir değer hata vermez, filtre yok sayılır ve istemci filtrelenmemiş
 * sonucu doğru sanır.
 */

import { describe, expect, it } from "vitest";
import { parseFilters } from "@/lib/filter-params";
import { buildOpenApiDocument } from "@/lib/api/openapi";

describe("varlık bayrakları", () => {
  it("web'in ürettiği \"1\" kabul edilir", () => {
    expect(parseFilters({ fotografli: "1", videolu: "1" })).toMatchObject({
      fotografli: true,
      videolu: true,
    });
  });

  it("REST istemcilerinin ürettiği \"true\" da kabul edilir", () => {
    // Aksi halde Dart tarafı ?fotografli=true gönderir ve filtre SESSİZCE
    // yok sayılır — bulunması zor bir hata sınıfı.
    expect(parseFilters({ fotografli: "true", videolu: "TRUE" })).toMatchObject({
      fotografli: true,
      videolu: true,
    });
  });

  it("diğer değerler bayrağı açmaz", () => {
    const f = parseFilters({ fotografli: "0", videolu: "evet" });
    expect(f.fotografli).toBeUndefined();
    expect(f.videolu).toBeUndefined();
  });
});

describe("sayısal parametreler", () => {
  it("tam sayı olarak çözülür", () => {
    expect(parseFilters({ minFiyat: "1500", maxYil: "2024", sayfa: "3" })).toMatchObject({
      minFiyat: 1500,
      maxYil: 2024,
      sayfa: 3,
    });
  });

  it("negatif değerler sıfıra çekilir", () => {
    expect(parseFilters({ minFiyat: "-5", minYil: "-1" })).toMatchObject({
      minFiyat: 0,
      minYil: 0,
    });
  });
});

describe("çoklu seçimler", () => {
  it("virgülle ayrılır ve beyaz listeyle sınırlanır", () => {
    const f = parseFilters({ yakit: "dizel,elektrik,uydurma", periyot: "gunluk,aylik" });
    expect(f.yakit).toEqual(["dizel", "elektrik"]);
    expect(f.periyot).toEqual(["gunluk", "aylik"]);
  });

  it("hiç geçerli değer yoksa undefined", () => {
    expect(parseFilters({ durum: "yok-boyle-bir-sey" }).durum).toBeUndefined();
  });
});

describe("dinamik teknik filtreler", () => {
  it("spec_ öneki soyulur, sayısal değerler sayıya çevrilir", () => {
    expect(parseFilters({ spec_operasyonAgirligi: "20", spec_kabin: "kapali" }).specs).toEqual({
      operasyonAgirligi: 20,
      kabin: "kapali",
    });
  });
});

describe("OpenAPI ↔ parseFilters uyumu", () => {
  interface DeclaredParam {
    name: string;
    schema?: { type?: string; enum?: string[]; items?: { enum?: string[] } };
  }

  const declared = (
    buildOpenApiDocument().paths as Record<string, { get: { parameters: DeclaredParam[] } }>
  )["/api/v1/listings"].get.parameters;

  /** Şemadan ayrıştırıcının kabul edeceği geçerli bir örnek değer türetir. */
  function sampleFor(p: DeclaredParam): string {
    // Çoklu seçim: enum items içinde (style: form, explode: false — virgüllü).
    if (p.schema?.type === "array") return p.schema.items?.enum?.[0] ?? "Caterpillar";
    if (p.schema?.enum?.length) return p.schema.enum[0];
    if (p.schema?.type === "integer") return p.name === "sayfa" ? "2" : "1500";
    return "ornek";
  }

  it("ilan edilen her parametre (spec_* hariç) ayrıştırılabiliyor", () => {
    const dynamic = new Set(["spec_*"]);
    const params = declared.filter((p) => !dynamic.has(p.name));
    expect(params.length).toBeGreaterThan(15);

    for (const p of params) {
      const parsed = parseFilters({ [p.name]: sampleFor(p) }) as Record<string, unknown>;
      // FilterState anahtarı parametre adıyla birebir aynı.
      expect(parsed, `${p.name} FilterState'te yok`).toHaveProperty(p.name);
      expect(parsed[p.name], `${p.name} boş çözüldü`).toBeDefined();
    }
  });

  it("çoklu seçim enum'larının TAMAMI kabul ediliyor", () => {
    for (const p of declared) {
      const values = p.schema?.items?.enum;
      if (!values?.length) continue;
      // Hepsini birden gönder: beyaz liste ile şema aynen örtüşmeli.
      const parsed = parseFilters({ [p.name]: values.join(",") }) as Record<string, unknown>;
      expect(parsed[p.name], `${p.name} şema/beyaz liste uyuşmazlığı`).toEqual(values);
    }
  });
});
