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
import { editDistance, parseWithRules } from "@/lib/core/voice-search/rules";
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

// Kullanıcı geri bildirimi: "getir" gibi komut kelimeleri filtre (q) olarak
// alınıyordu. q tam ifade olarak aranır; tek bir fazla kelime sonucu sıfırlar.
describe("komut ve bağlam kelimeleri aramaya girmez", () => {
  it("tır kategorisinde mercedes ve volvo markalarını getir", () => {
    const r = parseWithRules("tır kategorisinde mercedes ve volvo markalarını getir");
    expect(toParams(r.filters)).toEqual({ kategori: "tir", marka: "Mercedes-Benz,Volvo" });
    expect(r.remainder).toEqual([]);
    // Her şey anlaşıldı: LLM'e gitmeye gerek yok.
    expect(r.confidence).toBe("high");
  });

  it.each([
    "Ankara'da vinç getir",
    "Ankara'da vinç getirir misin",
    "Ankara'da vinç getirebilir misin",
    "Ankara'da vinç göstersene",
    "Ankara'da vinç ilanlarını listele",
    "Ankara'da vinç ilanlarını göster bana",
    "Ankara'da vinç bulabilir misin",
    "Ankara'daki tüm vinçleri getir",
    "Ankara'da vinç olsun",
  ])("%s → yalnız il + kategori", (text) => {
    expect(params(text)).toEqual({ il: "Ankara", kategori: "vinc-platform" });
  });

  it("ekli dolgu biçimleri de atılır (makineleri, araçları, modeli)", () => {
    expect(params("Ankara'daki makineleri getir")).toEqual({ il: "Ankara" });
    expect(params("JCB modeli kepçe araçları")).toEqual({ marka: "JCB", kategori: "hafriyat", altKategori: "beko-loder" });
  });

  it("'araç' Kastamonu'nun ilçesine çevrilmez; il söylenirse ilçe olarak kalır", () => {
    expect(params("Ankara'da araç getir")).toEqual({ il: "Ankara" });
    expect(params("Kastamonu Araç vinç")).toEqual({ il: "Kastamonu", ilce: "Araç", kategori: "vinc-platform" });
  });

  it("anlamlı anahtar kelime ve model kodu korunur", () => {
    expect(params("İstanbul hidrolik kırıcı getir")).toEqual({ il: "İstanbul", q: "hidrolik kırıcı" });
    expect(params("JCB 3CX getir")).toEqual({ marka: "JCB", q: "3CX" });
  });

  it("sözle söylenen model numarası rakamla aranır, LLM'e gerek kalmaz", () => {
    const r = parseWithRules("katerpilar üç yüz yirmi modelini göster");
    expect(toParams(r.filters)).toEqual({ marka: "Caterpillar", q: "320" });
    expect(r.confidence).toBe("high");
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

// ───────── Saha denemesinden çıkan iyileştirmeler ─────────
//
// Her test, 90 gerçekçi cümlelik bir denemede yanlış sonuç veren bir kalıbı
// sabitler. q ilan metninde aranır: sızan tek kelime sonucu sıfırlar, yanlış
// filtre aramayı daraltır ya da ters çevirir.

describe("olumsuzluk", () => {
  it("iki seçenekli filtre tersine döner", () => {
    expect(params("nakliye istemiyorum kepçe")).toMatchObject({ nakliye: "yok" });
    expect(params("operatör istemiyorum vinç")).toMatchObject({ operator: "operatorsuz" });
    expect(params("ikinci el olmasın forklift")).toMatchObject({ durum: "sifir" });
    expect(params("ikinci el olanları istemiyorum forklift")).toMatchObject({ durum: "sifir" });
    // Çift olumsuz: "operatörsüz olmasın" operatörlü istiyor demek.
    expect(params("operatörsüz olmasın")).toEqual({ operator: "operatorlu" });
    expect(params("nakliyesiz olmasın")).toEqual({ nakliye: "var" });
  });

  it("olumsuzlanan marka/konum hiç uygulanmaz (hariç tutma filtresi yok)", () => {
    expect(params("JCB olmasın kepçe")).toEqual({ kategori: "hafriyat", altKategori: "beko-loder" });
    expect(params("JCB markası olmasın kepçe")).toEqual({ kategori: "hafriyat", altKategori: "beko-loder" });
    expect(params("İstanbul hariç vinç")).toEqual({ kategori: "vinc-platform" });
    expect(params("Volvo dışında tır")).toEqual({ kategori: "tir" });
  });

  it("olumsuzluk sonraki filtreye taşmaz", () => {
    expect(params("JCB olmasın Ankara'da kepçe")).toEqual({
      il: "Ankara",
      kategori: "hafriyat",
      altKategori: "beko-loder",
    });
  });
});

describe("fiyat", () => {
  it.each([
    ["5 binden ucuz kepçe", { maxFiyat: "5000" }],
    ["bütçem 10 bin kepçe", { maxFiyat: "10000" }],
    ["20 binlik bütçem var", { maxFiyat: "20000" }],
    ["en fazla 5000 kepçe", { maxFiyat: "5000" }],
    ["5000 altı kepçe", { maxFiyat: "5000" }],
    ["beş bin altı kepçe", { maxFiyat: "5000" }],
    ["10 bine kadar forklift", { maxFiyat: "10000" }],
    ["5 binden fazla vinç", { minFiyat: "5000" }],
    ["10 bin ile 20 bin arası vinç", { minFiyat: "10000", maxFiyat: "20000" }],
    ["ayda 50 bin lira vinç", { periyot: "aylik", maxFiyat: "50000" }],
  ])("%s", (text, expected) => {
    const p = params(text);
    expect(p).toMatchObject(expected);
    expect(p.q).toBeUndefined();
  });

  it("birimden önceki sayı fiyat sayılmaz", () => {
    expect(params("en az 20 ton vinç")).toEqual({ kategori: "vinc-platform", spec_kaldirmaKapasitesi: "20" });
    expect(params("en az 2015 model kepçe")).toMatchObject({ minYil: "2015" });
    expect(params("en az 2015 model kepçe").minFiyat).toBeUndefined();
  });

  it("'beş bin altı yüz' yine 5600'dür", () => {
    expect(params("beş bin altı yüz liraya kadar")).toEqual({ maxFiyat: "5600" });
  });
});

describe("model yılı", () => {
  it.each([
    ["2018'den yeni kepçe", { minYil: "2018" }],
    ["2015 öncesi kepçe", { maxYil: "2015" }],
    ["2015 ile 2020 arası kepçe", { minYil: "2015", maxYil: "2020" }],
  ])("%s", (text, expected) => {
    const p = params(text);
    expect(p).toMatchObject(expected);
    expect(p.q).toBeUndefined();
  });

  it("son N yıl bu yıl dahil sayılır", () => {
    const thisYear = new Date().getFullYear();
    expect(params("son 5 yılın kepçesi")).toMatchObject({ minYil: String(thisYear - 4) });
  });

  it("yıl aralığı çip olarak iki uçla görünür", async () => {
    const res = await parseVoiceQuery({ text: "2015 ile 2020 arası kepçe" }, { llm: false });
    if (!res.ok) throw res.error;
    expect(res.value.chips.map((c) => c.label)).toEqual(
      expect.arrayContaining(["2015 ve sonrası", "2020 ve öncesi"]),
    );
  });
});

describe("ölçü", () => {
  it("birimden önce 'on' sayıdır", () => {
    expect(params("on tonluk vinç")).toEqual({ kategori: "vinc-platform", spec_kaldirmaKapasitesi: "10" });
  });

  it("tek başına 'platform' vinç/platformdur, tırın açık kasası değil", () => {
    expect(params("platform kiralık")).toEqual({ kategori: "vinc-platform" });
    expect(params("40 metrelik platform")).toEqual({ kategori: "vinc-platform", spec_calismaYuksekligi: "40" });
    // Dorse ile söylenirse açık kasa tır yine bulunur.
    expect(params("platform dorse")).toEqual({ kategori: "tir", altKategori: "acik-kasa" });
  });
});

describe("konuşma tanıma yazım hataları", () => {
  it.each([
    ["forkilift", { kategori: "forklift" }],
    ["jenaratör", { kategori: "jenerator" }],
    ["jenaratörler", { kategori: "jenerator" }],
    ["kompürsör", { kategori: "jenerator", altKategori: "kompresor" }],
    ["manlif", { kategori: "vinc-platform" }],
    ["telehendler", { kategori: "forklift", altKategori: "telehandler" }],
    ["konteynir tır", { kategori: "tir", altKategori: "konteyner" }],
    ["frigorifk tır", { kategori: "tir", altKategori: "frigorifik" }],
    ["skania tır", { kategori: "tir", marka: "Scania" }],
    ["hidromak", { marka: "Hidromek" }],
  ])("%s", (text, expected) => {
    expect(params(text)).toEqual(expected);
  });

  it("kısa ve gündelik kelimeler bulanık eşlenmez", () => {
    // "geniş" ~ "Genie": 6 harften kısa adlar havuzda yok.
    expect(params("geniş kasa tır")).toEqual({ kategori: "tir" });
    expect(params("salı günü kepçe")).toEqual({ kategori: "hafriyat", altKategori: "beko-loder" });
  });

  it("düzenleme uzaklığı komşu harf yer değiştirmesini tek hata sayar", () => {
    expect(editDistance("forklift", "forklfit")).toBe(1);
    expect(editDistance("kompursor", "kompresor")).toBe(2);
    expect(editDistance("vinc", "vinc")).toBe(0);
  });
});

describe("sektör kelimeleri ilçe sanılmaz", () => {
  it.each([
    ["açık kasa tır", "Kaş"],
    ["boru taşıma tır", "Bor"],
    ["maden ocağı için kamyon", "Maden"],
    ["bahçe düzenleme için mini kepçe", "Bahçe"],
  ])("%s", (text, district) => {
    expect(params(text).ilce).not.toBe(district);
    expect(params(text).il).toBeUndefined();
  });

  it("il ile birlikte söylenirse ilçe olarak tanınır", () => {
    expect(params("Niğde Bor forklift")).toMatchObject({ il: "Niğde", ilce: "Bor" });
    expect(params("Antalya Kaş vinç")).toMatchObject({ il: "Antalya", ilce: "Kaş" });
  });
});

describe("dolgu, operatör, eş anlamlılar", () => {
  it.each([
    "acaba Ankara'da kepçe var mı",
    "yani şey Ankara'da kepçe lazım",
    "abi Ankara'da bir kepçe bul",
    "merhaba Ankara'da kepçe arıyorum",
    "Ankara'da müsait olan kepçeler",
    "Ankara'da boş olan kepçeler",
    "rica etsem Ankara'da kepçe bakar mısın",
    "ee hmm Ankara'da kepçe",
    "Ankara'da kiralamak istediğim bir kepçe var",
  ])("%s → yalnız il + kepçe", (text) => {
    expect(params(text)).toEqual({ il: "Ankara", kategori: "hafriyat", altKategori: "beko-loder" });
  });

  it("şoförle / operatörle", () => {
    expect(params("şoförüyle tır")).toEqual({ kategori: "tir", operator: "operatorlu" });
    expect(params("şoför ile tır")).toEqual({ kategori: "tir", operator: "operatorlu" });
    expect(params("operatörüyle birlikte vinç")).toEqual({ kategori: "vinc-platform", operator: "operatorlu" });
  });

  it("boyut ve tek kelimelik adlar", () => {
    expect(params("küçük kepçe")).toEqual({ kategori: "hafriyat", altKategori: "bobcat" });
    expect(params("küçük ekskavatör")).toEqual({ kategori: "hafriyat", altKategori: "paletli-mini-ekskavator" });
    expect(params("büyük ekskavatör")).toEqual({ kategori: "hafriyat", altKategori: "paletli-ekskavator" });
    expect(params("pompa")).toEqual({ kategori: "beton" });
  });

  it("İstanbul yakaları il olarak tanınır", () => {
    expect(params("Avrupa yakası vinç")).toEqual({ il: "İstanbul", kategori: "vinc-platform" });
    expect(params("Anadolu yakasında forklift")).toEqual({ il: "İstanbul", kategori: "forklift" });
  });

  it("aynı kategoriden iki alt tür → yalnız kategori", () => {
    expect(params("kepçe veya ekskavatör Ankara")).toEqual({ kategori: "hafriyat", il: "Ankara" });
    // Farklı kategoriler aynı anda aranamaz; ilk söylenen kalır.
    expect(params("vinç ve forklift İzmir")).toEqual({ kategori: "vinc-platform", il: "İzmir" });
  });
});

describe("model kodları", () => {
  it("bölünmüş kod birleşik aranır", () => {
    expect(params("JCB 3 CX")).toEqual({ marka: "JCB", q: "3 CX" });
    expect(params("PC 210 komatsu")).toEqual({ marka: "Komatsu", q: "PC 210" });
  });

  it("birden çok ayrı kod q'ya girmez (aramada 'ya da' yok)", () => {
    expect(params("JCB 3CX ve 4CX")).toEqual({ marka: "JCB" });
  });
});
