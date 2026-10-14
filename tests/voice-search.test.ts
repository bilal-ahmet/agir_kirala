/**
 * Sesli arama sözleşme testleri.
 *
 * Kural motoru saf: ağ ve DB yok. LLM yedeği sahte bir istemciyle sınanır;
 * gerçek API'ye hiçbir testte gidilmez.
 */

import { describe, expect, it, vi } from "vitest";
import { parseFilters } from "@/lib/filter-params";
import { merge, parseVoiceQuery, toParams } from "@/lib/core/voice-search";
import { parseWithLlm } from "@/lib/core/voice-search/llm";
import { tokenize } from "@/lib/core/voice-search/normalize";
import { parseWithRules } from "@/lib/core/voice-search/rules";
import { emptyFilters } from "@/lib/core/voice-search/types";

/** Kural motorunun ürettiği URL parametreleri. */
const params = (text: string) => toParams(parseWithRules(text).filters);

describe("normalleştirme", () => {
  it("kesme işaretli eki atar, sayıları birleştirir", () => {
    expect(tokenize("İstanbul'da beş bin TL'ye").map((t) => t.key)).toEqual(["istanbul", "5000", "tl"]);
  });

  it("tek başına 'bir' ve 'sıfır' sayı değildir", () => {
    expect(tokenize("bir kepçe").map((t) => t.key)).toEqual(["bir", "kepce"]);
    expect(tokenize("sıfır ekskavatör").map((t) => t.key)).toEqual(["sifir", "ekskavator"]);
  });

  it("binlik ayırıcı ve ondalık", () => {
    expect(tokenize("5.000 lira").map((t) => t.key)).toEqual(["5000", "lira"]);
    expect(tokenize("1,5 ton").map((t) => t.key)).toEqual(["1.5", "ton"]);
  });
});

describe("kural motoru: konum, kategori, marka, model", () => {
  it("il eki + gündelik ad", () => {
    expect(params("istanbulda kiralık kepçe")).toEqual({
      il: "İstanbul",
      kategori: "hafriyat",
      altKategori: "beko-loder",
    });
  });

  it("il + ilçe + operatör + periyot + kategori", () => {
    expect(params("Ankara Çankaya operatörlü vinç günlük")).toEqual({
      il: "Ankara",
      ilce: "Çankaya",
      kategori: "vinc-platform",
      operator: "operatorlu",
      periyot: "gunluk",
    });
  });

  it("marka + model kodu", () => {
    expect(params("JCB 3CX")).toEqual({ marka: "JCB", q: "3CX" });
  });

  it("STT yazımı, takma ad ve sıralama", () => {
    expect(params("cat 320 eskavatör en ucuz")).toEqual({
      marka: "Caterpillar",
      q: "320",
      kategori: "hafriyat",
      altKategori: "paletli-ekskavator",
      sirala: "fiyat-artan",
    });
  });

  it("tek ile ait ilçe ili de doldurur", () => {
    expect(params("Kadıköy'de forklift")).toEqual({ il: "İstanbul", ilce: "Kadıköy", kategori: "forklift" });
  });

  it("belirsiz ilçe yok sayılır, serbest metne de girmez", () => {
    expect(params("Merkez'de jeneratör")).toEqual({ kategori: "jenerator" });
  });

  it("ilçe ilden önce söylenebilir", () => {
    expect(params("Çankaya Ankara forklift")).toMatchObject({ il: "Ankara", ilce: "Çankaya" });
  });

  it("marka ile ilçe çakışması: il yoksa marka", () => {
    expect(params("Çukurova beko loder")).toEqual({
      marka: "Çukurova",
      kategori: "hafriyat",
      altKategori: "beko-loder",
    });
    expect(params("Adana Çukurova kepçe")).toMatchObject({ il: "Adana", ilce: "Çukurova" });
  });

  it("en uzun ifade önce: alt kategori adı bölünmez", () => {
    expect(params("elektrikli forklift")).toEqual({ kategori: "forklift", altKategori: "elektrikli" });
    expect(params("mini ekskavatör")).toEqual({ kategori: "hafriyat", altKategori: "paletli-mini-ekskavator" });
  });

  it("alt kategori kategoriyi belirler", () => {
    expect(params("vinç hiyap")).toEqual({ kategori: "vinc-platform", altKategori: "hiyap-vinc" });
  });

  it("kısa il adları", () => {
    expect(params("Antep'te jeneratör")).toMatchObject({ il: "Gaziantep" });
  });

  it("çok kelimeli marka ve ilk kelime takma adı", () => {
    expect(params("new holland kazıcı yükleyici")).toMatchObject({ marka: "New Holland", altKategori: "beko-loder" });
    expect(params("ford damperli kamyon")).toMatchObject({ marka: "Ford Trucks", kategori: "damperli-kamyon" });
  });
});

describe("kural motoru: nitelikler", () => {
  it("fiyat üst sınırı ve aylık", () => {
    expect(params("5 bin liraya kadar aylık jeneratör")).toEqual({
      maxFiyat: "5000",
      periyot: "aylik",
      kategori: "jenerator",
    });
  });

  it("fiyat alt sınırı", () => {
    expect(params("en az 2000 lira forklift")).toMatchObject({ minFiyat: "2000" });
  });

  it("model yılı", () => {
    expect(params("2018 ve üzeri JCB")).toMatchObject({ minYil: "2018", marka: "JCB" });
    expect(params("2020 model ekskavatör")).toMatchObject({ minYil: "2020" });
  });

  it("süre ifadeleri periyoda çevrilir ve sayı serbest metne sızmaz", () => {
    expect(params("3 aylık vinç")).toEqual({ kategori: "vinc-platform", periyot: "aylik" });
    expect(params("10 gün kepçe")).toMatchObject({ periyot: "gunluk" });
    expect(params("2 tane kepçe")).toEqual({ kategori: "hafriyat", altKategori: "beko-loder" });
  });

  it("ölçü kategorinin teknik filtresine bağlanır", () => {
    expect(params("20 tonluk ekskavatör")).toMatchObject({ spec_operasyonAgirligi: "20" });
    expect(params("3 tonluk forklift")).toMatchObject({ spec_kaldirmaKapasitesi: "3000" });
    expect(params("500 kva jeneratör")).toMatchObject({ spec_guc: "500" });
    expect(params("16 metre makaslı platform")).toMatchObject({ spec_calismaYuksekligi: "16" });
    // Kategori yoksa ölçü atılır, q'ya da girmez.
    expect(params("20 tonluk")).toEqual({});
  });

  it("nakliye, durum, yakıt", () => {
    expect(params("nakliyeli ikinci el dizel jeneratör")).toEqual({
      nakliye: "var",
      durum: "ikinci_el",
      yakit: "dizel",
      kategori: "jenerator",
    });
    expect(params("nakliyesiz sıfır kepçe")).toMatchObject({ nakliye: "yok", durum: "sifir" });
    expect(params("operatörsüz kepçe")).toMatchObject({ operator: "operatorsuz" });
  });

  it("sıralama türleri", () => {
    expect(params("son model ekskavatör")).toMatchObject({ sirala: "yil-yeni" });
    expect(params("en yeni ilanlar")).toMatchObject({ sirala: "yeni" });
    expect(params("en pahalı vinç")).toMatchObject({ sirala: "fiyat-azalan" });
  });

  it("dolgu kelimeleri atılır", () => {
    const r = parseWithRules("bana İzmir'de kiralık bir forklift bulur musun lütfen");
    expect(toParams(r.filters)).toEqual({ il: "İzmir", kategori: "forklift" });
    expect(r.remainder).toEqual([]);
    expect(r.confidence).toBe("high");
  });
});

describe("güven düzeyi", () => {
  it("anlaşılmayan iki+ kelime → low (LLM yedeğine değer)", () => {
    const r = parseWithRules("yarın şantiyede toprak kazacak büyükçe makine");
    expect(r.confidence).toBe("low");
  });

  it("hiçbir şey tanınmadıysa tek kelime de low", () => {
    expect(parseWithRules("kırıcı").confidence).toBe("low");
  });

  it("yalnız model kodu kaldıysa high", () => {
    expect(parseWithRules("komatsu PC210").confidence).toBe("high");
  });

  it("LLM yokken anlaşılmayan kelimeler bugünkü metin araması gibi q olur", () => {
    expect(params("İstanbul hidrolik kırıcı")).toEqual({ il: "İstanbul", q: "hidrolik kırıcı" });
  });
});

describe("arama sözleşmesiyle uyum", () => {
  const SAMPLES = [
    "istanbulda kiralık kepçe",
    "Ankara Çankaya operatörlü vinç günlük",
    "cat 320 eskavatör en ucuz",
    "5 bin liraya kadar aylık jeneratör",
    "nakliyeli ikinci el dizel jeneratör 2019 ve sonrası",
    "20 tonluk ekskavatör",
    "JCB Hidromek kepçe haftalık",
  ];

  it.each(SAMPLES)("%s → üretilen her parametre parseFilters'ta tanınır", async (text) => {
    const res = await parseVoiceQuery({ text }, { llm: false });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    const f = parseFilters(res.value.params);
    for (const [key, value] of Object.entries(res.value.params)) {
      if (key.startsWith("spec_")) expect(f.specs?.[key.slice(5)]).toBe(Number(value));
      else expect(f[key as keyof typeof f], key).toBeDefined();
    }
    expect(res.value.chips.length).toBeGreaterThan(0);
  });

  it("boş ve çok uzun metin doğrulama hatasıdır", async () => {
    const empty = await parseVoiceQuery({ text: "   " }, { llm: false });
    expect(empty.ok).toBe(false);
    const long = await parseVoiceQuery({ text: "a".repeat(201) }, { llm: false });
    expect(long.ok).toBe(false);
    if (!long.ok) expect(long.error.code).toBe("validation");
  });

  it("çipler Türkçe etiket taşır", async () => {
    const res = await parseVoiceQuery({ text: "İzmir operatörlü kepçe 5000 liraya kadar" }, { llm: false });
    if (!res.ok) throw res.error;
    const labels = res.value.chips.map((c) => c.label);
    expect(labels).toEqual(
      expect.arrayContaining(["İzmir", "Operatörlü", "Hafriyat Makineleri", "Beko Loder (Kazıcı Yükleyici)", "En fazla 5.000 ₺"]),
    );
  });
});

// ───────── LLM yedeği (sahte istemci) ─────────

function fakeClient(result: { parsed_output: unknown; stop_reason?: string } | Error) {
  const parse = vi.fn(async () => {
    if (result instanceof Error) throw result;
    return { stop_reason: "end_turn", ...result };
  });
  return { client: { messages: { parse } } as never, parse };
}

const llmOutput = (o: Record<string, unknown>) => ({
  altKategori: "",
  kategori: "",
  il: "",
  ilce: "",
  marka: [],
  q: "",
  periyot: [],
  operator: "",
  nakliye: "",
  durum: "",
  minFiyat: 0,
  maxFiyat: 0,
  minYil: 0,
  sirala: "",
  ...o,
});

describe("LLM yedeği", () => {
  const FREE_TEXT = "yarın şantiyede toprak kazacak büyükçe makine İzmir";

  it("yüksek güvende hiç çağrılmaz", async () => {
    const { client, parse } = fakeClient({ parsed_output: llmOutput({}) });
    const res = await parseVoiceQuery({ text: "İzmir kepçe" }, { llmDeps: { client } });
    expect(parse).not.toHaveBeenCalled();
    if (res.ok) expect(res.value.source).toBe("rules");
  });

  it("düşük güvende çağrılır; kurallar korunur, boşlar dolar, q LLM'den gelir", async () => {
    const { client, parse } = fakeClient({
      parsed_output: llmOutput({
        kategori: "hafriyat",
        altKategori: "hafriyat/paletli-ekskavator",
        il: "Ankara", // kural İzmir buldu; kural kazanır
      }),
    });
    const res = await parseVoiceQuery({ text: FREE_TEXT }, { llmDeps: { client } });
    expect(parse).toHaveBeenCalledOnce();
    if (!res.ok) throw res.error;
    expect(res.value.source).toBe("llm");
    expect(res.value.params).toEqual({ il: "İzmir", kategori: "hafriyat", altKategori: "paletli-ekskavator" });
  });

  it("hız sınırı kancası fırlatırsa LLM atlanır, arama yine döner", async () => {
    const { client, parse } = fakeClient({ parsed_output: llmOutput({ kategori: "forklift" }) });
    const res = await parseVoiceQuery(
      { text: FREE_TEXT },
      { llmDeps: { client }, beforeLlm: async () => Promise.reject(new Error("rate_limited")) },
    );
    expect(parse).not.toHaveBeenCalled();
    expect(res.ok && res.value.source).toBe("rules");
  });

  it("hata, ret ve boş çıktı kural sonucuna düşer", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const r of [
      new Error("timeout"),
      { parsed_output: llmOutput({ kategori: "forklift" }), stop_reason: "refusal" },
      { parsed_output: null },
    ]) {
      const { client } = fakeClient(r);
      const res = await parseVoiceQuery({ text: FREE_TEXT }, { llmDeps: { client } });
      expect(res.ok && res.value.source).toBe("rules");
      expect(res.ok && res.value.params).toMatchObject({ il: "İzmir" });
    }
    warn.mockRestore();
  });

  it("taksonomi dışı değerler atılır", async () => {
    const { client } = fakeClient({
      parsed_output: llmOutput({
        altKategori: "hafriyat/uydurma",
        kategori: "uzay-araclari",
        il: "Atlantis",
        marka: ["JCB", "Uydurma Marka"],
        ilce: "Kadıköy",
        minYil: 1800,
        maxFiyat: -5,
      }),
    });
    const out = await parseWithLlm("x", emptyFilters(), { client });
    expect(out).toMatchObject({ marka: ["JCB"], il: "İstanbul", ilce: "Kadıköy" });
    expect(out?.kategori).toBeUndefined();
    expect(out?.altKategori).toBeUndefined();
    expect(out?.minYil).toBeUndefined();
    expect(out?.maxFiyat).toBeUndefined();
  });

  it("birleştirme: model kodu q'su korunur, farklı kategorideki alt kategori alınmaz", () => {
    const rules = { ...emptyFilters(), kategori: "forklift", q: "3CX" };
    const llm = { ...emptyFilters(), kategori: "hafriyat", altKategori: "beko-loder", q: "kepçe" };
    const m = merge(rules, llm);
    expect(m.kategori).toBe("forklift");
    expect(m.altKategori).toBeUndefined();
    expect(m.q).toBe("3CX");
  });
});

describe("tır", () => {
  it("il + dorse tipi", () => {
    expect(params("İstanbul'da lowbed")).toEqual({ il: "İstanbul", kategori: "tir", altKategori: "lowbed" });
    expect(params("frigorifik tır İzmir")).toMatchObject({ kategori: "tir", altKategori: "frigorifik", il: "İzmir" });
  });

  it("şoförlü + sefer başı", () => {
    expect(params("şoförlü tenteli tır sefer başı")).toEqual({
      operator: "operatorlu",
      kategori: "tir",
      altKategori: "tenteli",
      periyot: "sefer",
    });
  });

  it("tonaj lowbed'in taşıma kapasitesine bağlanır", () => {
    expect(params("60 tonluk lowbed")).toMatchObject({ altKategori: "lowbed", spec_tasimaKapasitesi: "60" });
  });

  it("çekici ve marka", () => {
    expect(params("Scania çekici")).toEqual({ marka: "Scania", kategori: "tir", altKategori: "cekici" });
  });

  it("'nakliye için tır' tır aramasını nakliye filtresiyle boşaltmaz", async () => {
    const res = await parseVoiceQuery({ text: "ekskavatör nakliyesi için tır lazım Kocaeli" }, { llm: false });
    if (!res.ok) throw res.error;
    expect(res.value.params.nakliye).toBeUndefined();
  });

  it("'salı' günü açık kasa sayılmaz", () => {
    expect(params("salı günü kepçe")).not.toMatchObject({ kategori: "tir" });
  });
});
