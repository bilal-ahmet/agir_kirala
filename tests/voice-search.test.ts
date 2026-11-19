/**
 * Sesli arama sözleşme testleri.
 *
 * Kural motoru saf: ağ ve DB yok. LLM yedeği sahte bir istemciyle sınanır;
 * gerçek API'ye hiçbir testte gidilmez.
 */

import { describe, expect, it, vi } from "vitest";
import { parseFilters } from "@/lib/filter-params";
import { applyOps, parseVoiceQuery, toParams } from "@/lib/core/voice-search";
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
      ilce: "Ankara/Çankaya",
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
    expect(params("Kadıköy'de forklift")).toEqual({ il: "İstanbul", ilce: "İstanbul/Kadıköy", kategori: "forklift" });
  });

  it("belirsiz ilçe yok sayılır, serbest metne de girmez", () => {
    expect(params("Merkez'de jeneratör")).toEqual({ kategori: "jenerator" });
  });

  it("ilçe ilden önce söylenebilir", () => {
    expect(params("Çankaya Ankara forklift")).toMatchObject({ il: "Ankara", ilce: "Ankara/Çankaya" });
  });

  it("marka ile ilçe çakışması: il yoksa marka", () => {
    expect(params("Çukurova beko loder")).toEqual({
      marka: "Çukurova",
      kategori: "hafriyat",
      altKategori: "beko-loder",
    });
    expect(params("Adana Çukurova kepçe")).toMatchObject({ il: "Adana", ilce: "Adana/Çukurova" });
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
    expect(params("Kastamonu Araç vinç")).toEqual({ il: "Kastamonu", ilce: "Kastamonu/Araç", kategori: "vinc-platform" });
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
      if (key.startsWith("spec_")) expect(f.specs?.[key.slice(5)]).toEqual(Number(value));
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
  mod: "yeni",
  altKategori: [],
  kategori: [],
  il: [],
  ilce: [],
  marka: [],
  q: "",
  periyot: [],
  operator: "",
  nakliye: "",
  durum: "",
  yakit: [],
  minFiyat: 0,
  maxFiyat: 0,
  minYil: 0,
  maxYil: 0,
  sirala: "",
  ...o,
});

describe("LLM yedeği (hybrid motor)", () => {
  const FREE_TEXT = "yarın şantiyede toprak kazacak büyükçe makine İzmir";

  it("yüksek güvende hiç çağrılmaz", async () => {
    const { client, parse } = fakeClient({ parsed_output: llmOutput({}) });
    const res = await parseVoiceQuery({ text: "İzmir kepçe" }, { engine: "hybrid", llmDeps: { client } });
    expect(parse).not.toHaveBeenCalled();
    if (res.ok) expect(res.value.source).toBe("rules");
  });

  it("düşük güvende çağrılır; kurallar korunur, boşlar dolar, q LLM'den gelir", async () => {
    const { client, parse } = fakeClient({
      parsed_output: llmOutput({
        kategori: ["hafriyat"],
        altKategori: ["hafriyat/paletli-ekskavator"],
        il: ["Ankara"], // kural İzmir buldu; kural kazanır
      }),
    });
    const res = await parseVoiceQuery({ text: FREE_TEXT }, { engine: "hybrid", llmDeps: { client } });
    expect(parse).toHaveBeenCalledOnce();
    if (!res.ok) throw res.error;
    expect(res.value.source).toBe("llm");
    expect(res.value.params).toEqual({ il: "İzmir", kategori: "hafriyat", altKategori: "paletli-ekskavator" });
  });

  it("hız sınırı kancası fırlatırsa LLM atlanır, arama yine döner", async () => {
    const { client, parse } = fakeClient({ parsed_output: llmOutput({ kategori: ["forklift"] }) });
    const res = await parseVoiceQuery(
      { text: FREE_TEXT },
      { engine: "hybrid", llmDeps: { client }, beforeLlm: async () => Promise.reject(new Error("rate_limited")) },
    );
    expect(parse).not.toHaveBeenCalled();
    expect(res.ok && res.value.source).toBe("rules");
  });

  it("hata, ret ve boş çıktı kural sonucuna düşer", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    for (const r of [
      new Error("timeout"),
      { parsed_output: llmOutput({ kategori: ["forklift"] }), stop_reason: "refusal" },
      { parsed_output: null },
    ]) {
      const { client } = fakeClient(r);
      const res = await parseVoiceQuery({ text: FREE_TEXT }, { engine: "hybrid", llmDeps: { client } });
      expect(res.ok && res.value.source).toBe("rules");
      expect(res.ok && res.value.params).toMatchObject({ il: "İzmir" });
    }
    warn.mockRestore();
  });

  it("taksonomi dışı değerler atılır", async () => {
    const { client } = fakeClient({
      parsed_output: llmOutput({
        altKategori: ["hafriyat/uydurma"],
        kategori: ["uzay-araclari"],
        il: ["Atlantis"],
        marka: ["JCB", "Uydurma Marka"],
        ilce: ["Kadıköy", "Ankara/Kadıköy", "Merkez"],
        minYil: 1800,
        maxYil: 2999,
        maxFiyat: -5,
      }),
    });
    const out = await parseWithLlm("x", emptyFilters(), { client });
    // Yalın tekil ilçe ilini getirir; yanlış ile bağlanmış ve belirsiz ilçe atılır.
    expect(out?.filters).toMatchObject({ marka: ["JCB"], il: ["İstanbul"], ilce: ["İstanbul/Kadıköy"] });
    expect(out?.filters.kategori).toEqual([]);
    expect(out?.filters.altKategori).toEqual([]);
    expect(out?.filters.minYil).toBeUndefined();
    expect(out?.filters.maxYil).toBeUndefined();
    expect(out?.filters.maxFiyat).toBeUndefined();
    // Mevcut filtre verilmediyse "duzenle" yok sayılır.
    expect(out?.mode).toBe("new");
  });

  it("çoklu değerler ve alt kategorinin kategorisi", async () => {
    const { client } = fakeClient({
      parsed_output: llmOutput({ altKategori: ["hafriyat/beko-loder"], kategori: ["forklift"], il: ["İzmir", "Manisa"] }),
    });
    const out = await parseWithLlm("x", emptyFilters(), { client });
    expect(out?.filters).toMatchObject({
      kategori: ["hafriyat", "forklift"],
      altKategori: ["beko-loder"],
      il: ["İzmir", "Manisa"],
    });
  });

  it("birleştirme: kural sonucu LLM kümesinin üstüne uygulanır, model kodu q'su korunur", () => {
    const rules = { ...emptyFilters(), kategori: ["forklift"], q: "3CX" };
    const llm = { ...emptyFilters(), kategori: ["hafriyat"], altKategori: ["beko-loder"], q: "kepçe" };
    const m = applyOps(llm, rules, { add: false, only: [] });
    expect(m.kategori).toEqual(["hafriyat", "forklift"]);
    expect(m.altKategori).toEqual(["beko-loder"]);
    expect(m.q).toBe("3CX");
  });

  it("düzenlemede LLM'e mevcut filtreler gider ve tam kümeyi döndürür", async () => {
    const { client, parse } = fakeClient({
      parsed_output: llmOutput({ mod: "duzenle", il: ["İstanbul", "Kocaeli"], kategori: ["hafriyat"] }),
    });
    const res = await parseVoiceQuery(
      { text: "şu Kocaeli tarafına da bir göz atalım", current: { il: "İstanbul", kategori: "hafriyat", fotografli: "1" } },
      { engine: "hybrid", llmDeps: { client } },
    );
    if (!res.ok) throw res.error;
    const sent = JSON.stringify((parse.mock.calls[0] as unknown[])[0]);
    expect(sent).toContain("Mevcut filtreler");
    expect(res.value.source).toBe("llm");
    expect(res.value.mode).toBe("refine");
    expect(res.value.params).toEqual({ il: "İstanbul,Kocaeli", kategori: "hafriyat", fotografli: "1" });
    expect(res.value.changes?.added.map((c) => c.label)).toEqual(["Kocaeli"]);
  });

  it("yeni aramada LLM'in kuralın bulmadığı ili eklemesine izin verilmez", async () => {
    const { client } = fakeClient({
      parsed_output: llmOutput({ kategori: ["forklift"], il: ["İzmir", "Aydın"] }),
    });
    const res = await parseVoiceQuery({ text: "İzmir'de depoda palet taşıyacak bir şey" }, { engine: "hybrid", llmDeps: { client } });
    expect(res.ok && res.value.params).toEqual({ il: "İzmir", kategori: "forklift" });
  });
});

describe("LLM motoru (varsayılan)", () => {
  const SENTENCE = "güzel Kocaeli'de Arabic lazım bunu şey yapacağız toprak kazacağız biz bunları Recep Bey olsun";

  it("varsayılan motor LLM: kuralların anladığı cümle de LLM'e gider, kural sonucu karışmaz", async () => {
    const { client, parse } = fakeClient({ parsed_output: llmOutput({ kategori: ["forklift"], il: ["Ankara"] }) });
    const res = await parseVoiceQuery({ text: "İzmir kepçe" }, { llmDeps: { client } });
    expect(parse).toHaveBeenCalledOnce();
    if (!res.ok) throw res.error;
    expect(res.value.source).toBe("llm");
    // Kuralların İzmir/beko-loder sonucu eklenmez: yalnız modelin kümesi.
    expect(res.value.params).toEqual({ kategori: "forklift", il: "Ankara" });
    const req = (parse.mock.calls[0] as unknown[])[0] as { messages: unknown };
    expect(JSON.stringify(req.messages)).not.toContain("Zaten bulunanlar");
  });

  it("bozuk konuşma metni: modelin kümesi olduğu gibi, anlamsız kelimeler q'ya girmez", async () => {
    const { client } = fakeClient({
      parsed_output: llmOutput({ kategori: ["hafriyat"], il: ["Kocaeli"], marka: ["JCB"], operator: "operatorlu" }),
    });
    const res = await parseVoiceQuery({ text: SENTENCE }, { engine: "llm", llmDeps: { client } });
    if (!res.ok) throw res.error;
    expect(res.value.params).toEqual({ kategori: "hafriyat", il: "Kocaeli", marka: "JCB", operator: "operatorlu" });
    expect(res.value.remainder).toBe("");
  });

  it("LLM kullanılamazsa kurallara düşülür (hata, hız sınırı)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const failing = fakeClient(new Error("timeout"));
    const a = await parseVoiceQuery({ text: "İzmir kepçe" }, { engine: "llm", llmDeps: { client: failing.client } });
    expect(a.ok && a.value.source).toBe("rules");
    expect(a.ok && a.value.params).toMatchObject({ il: "İzmir", altKategori: "beko-loder" });

    const limited = fakeClient({ parsed_output: llmOutput({ kategori: ["forklift"] }) });
    const b = await parseVoiceQuery(
      { text: "İzmir kepçe" },
      { engine: "llm", llmDeps: { client: limited.client }, beforeLlm: async () => Promise.reject(new Error("rate_limited")) },
    );
    expect(limited.parse).not.toHaveBeenCalled();
    expect(b.ok && b.value.source).toBe("rules");
    warn.mockRestore();
  });

  it("düzenleme: modelin tam kümesi; sesin modellemediği parametreler korunur", async () => {
    const { client, parse } = fakeClient({
      parsed_output: llmOutput({
        mod: "duzenle",
        kategori: ["hafriyat"],
        il: ["İstanbul", "Kocaeli"],
        teknik: [{ alan: "operasyonAgirligi", sayi: 20, secenekler: [] }],
      }),
    });
    const res = await parseVoiceQuery(
      {
        text: "Kocaeli tarafına da bakalım",
        current: { il: "İstanbul", kategori: "hafriyat", spec_operasyonAgirligi: "20", fotografli: "1" },
      },
      { engine: "llm", llmDeps: { client } },
    );
    if (!res.ok) throw res.error;
    const sent = JSON.stringify((parse.mock.calls[0] as unknown[])[0]);
    expect(sent).toContain("operasyonAgirligi"); // mevcut teknik filtre modele gider
    expect(res.value.mode).toBe("refine");
    expect(res.value.params).toEqual({
      il: "İstanbul,Kocaeli",
      kategori: "hafriyat",
      spec_operasyonAgirligi: "20",
      fotografli: "1",
    });
    expect(res.value.changes?.added.map((c) => c.label)).toEqual(["Kocaeli"]);
  });

  it("'filtreleri temizle': boş küme, sesin dışındaki parametreler de gider", async () => {
    const { client } = fakeClient({ parsed_output: llmOutput({ mod: "duzenle" }) });
    const res = await parseVoiceQuery(
      { text: "filtreleri temizle", current: { il: "İstanbul", fotografli: "1" } },
      { engine: "llm", llmDeps: { client } },
    );
    if (!res.ok) throw res.error;
    expect(res.value.mode).toBe("refine");
    expect(res.value.params).toEqual({});
  });

  it("teknik alanlar seçime göre süzülür", async () => {
    const tek = (alan: string, sayi: number, secenekler: string[] = []) => ({ alan, sayi, secenekler });
    const one = fakeClient({
      parsed_output: llmOutput({
        kategori: ["tir"],
        teknik: [tek("euroNorm", 0, ["Euro 6", "Euro 9"]), tek("adr", 1), tek("operasyonAgirligi", 20)],
      }),
    });
    const out = await parseWithLlm("x", emptyFilters(), { client: one.client });
    // Euro 9 listede yok; operasyon ağırlığı tırın alanı değil.
    expect(out?.filters.specs).toEqual({ euroNorm: ["Euro 6"], adr: ["true"] });

    const many = fakeClient({
      parsed_output: llmOutput({ kategori: ["hafriyat", "forklift"], teknik: [tek("operasyonAgirligi", 20)] }),
    });
    const out2 = await parseWithLlm("x", emptyFilters(), { client: many.client });
    expect(out2?.filters.specs).toEqual({}); // birden çok kategoride teknik alan yok
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
    ["10 binin altında kepçe", { maxFiyat: "10000" }],
    ["5 binin üstünde vinç", { minFiyat: "5000" }],
    ["3 ton kaldıran forklift", { spec_kaldirmaKapasitesi: "3000" }],
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
    ["2018 üzeri kepçe", { minYil: "2018" }],
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
    expect(params(text).ilce ?? "").not.toContain(district);
    expect(params(text).il).toBeUndefined();
  });

  it("il ile birlikte söylenirse ilçe olarak tanınır", () => {
    expect(params("Niğde Bor forklift")).toMatchObject({ il: "Niğde", ilce: "Niğde/Bor" });
    expect(params("Antalya Kaş vinç")).toMatchObject({ il: "Antalya", ilce: "Antalya/Kaş" });
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

});

describe("çoklu seçim", () => {
  it("aynı kategoriden iki alt tür ikisini birden seçer", () => {
    expect(params("kepçe veya ekskavatör Ankara")).toEqual({
      kategori: "hafriyat",
      altKategori: "beko-loder,paletli-ekskavator",
      il: "Ankara",
    });
  });

  it("farklı kategoriler ve iller birlikte", () => {
    expect(params("vinç ve forklift İzmir")).toEqual({ kategori: "vinc-platform,forklift", il: "İzmir" });
    expect(params("Ankara ve İzmir'de operatörlü kepçe ya da forklift")).toEqual({
      il: "Ankara,İzmir",
      kategori: "hafriyat,forklift",
      altKategori: "beko-loder",
      operator: "operatorlu",
    });
  });

  it("ilçe kendi iline bağlanır, diğer il bütün kalır", () => {
    expect(params("Ankara Çankaya ve İzmir'de vinç")).toEqual({
      il: "Ankara,İzmir",
      ilce: "Ankara/Çankaya",
      kategori: "vinc-platform",
    });
  });

  it("başka bir ile ait tekil ilçe o ili de ekler", () => {
    expect(params("Ankara ve Kadıköy'de forklift")).toEqual({
      il: "Ankara,İstanbul",
      ilce: "İstanbul/Kadıköy",
      kategori: "forklift",
    });
  });

  it("birden çok kategori seçiliyken ölçü atılır (teknik alanlar kategoriye özgü)", () => {
    expect(params("20 tonluk ekskavatör ya da vinç")).toEqual({
      kategori: "hafriyat,vinc-platform",
      altKategori: "paletli-ekskavator",
    });
  });

  it("seçenekli teknik özellikler taksonomiden tanınır", () => {
    expect(params("Euro 6 otomatik çekici")).toEqual({
      kategori: "tir",
      altKategori: "cekici",
      spec_euroNorm: "Euro 6",
      spec_sanziman: "Otomatik",
    });
    expect(params("havuzlu lowbed hidrolik rampa")).toMatchObject({
      altKategori: "lowbed",
      spec_lowbedTipi: "Havuzlu",
      spec_rampaTipi: "Hidrolik",
    });
    // Tek kategori yokken seçenek aranmaz.
    expect(params("otomatik")).toEqual({ q: "otomatik" });
  });

  it("çipler: ilçe birden çok ilde ilini, seçenekli özellik alan adını taşır", async () => {
    const multi = await parseVoiceQuery({ text: "Ankara Çankaya ve İzmir'de vinç" }, { llm: false });
    if (!multi.ok) throw multi.error;
    expect(multi.value.chips.map((c) => c.label)).toContain("Çankaya (Ankara)");
    const spec = await parseVoiceQuery({ text: "Euro 6 çekici" }, { llm: false });
    if (!spec.ok) throw spec.error;
    expect(spec.value.chips.map((c) => c.label)).toContain("Emisyon Normu: Euro 6");
  });

  it("tek ilde ilçe çipi yalnız ilçe adıdır; parametre İl/İlçe", async () => {
    const res = await parseVoiceQuery({ text: "Ankara Çankaya vinç" }, { llm: false });
    if (!res.ok) throw res.error;
    expect(res.value.params.ilce).toBe("Ankara/Çankaya");
    expect(res.value.chips).toContainEqual({ param: "ilce", value: "Ankara/Çankaya", label: "Çankaya" });
  });

  it("panel budamasından geçer; kategorinin markaları korunur", async () => {
    const res = await parseVoiceQuery({ text: "tır kategorisinde mercedes ve volvo" }, { llm: false });
    if (!res.ok) throw res.error;
    expect(res.value.params).toEqual({ kategori: "tir", marka: "Mercedes-Benz,Volvo" });
    // Kategorinin listesinde olmayan marka da atılmaz: söylenen aranır,
    // ilan yoksa sonuç sayfası "uygun ilan yok" der.
    const odd = await parseVoiceQuery({ text: "Scania forklift" }, { llm: false });
    expect(odd.ok && odd.value.params).toEqual({ kategori: "forklift", marka: "Scania" });
  });
});

// ───────── Mevcut filtreleri düzenleme ─────────

describe("düzenleme modu", () => {
  const current = { il: "İstanbul", kategori: "hafriyat", marka: "JCB,Hidromek" };
  const refine = async (text: string, cur: Record<string, string> = current) => {
    const res = await parseVoiceQuery({ text, current: cur }, { llm: false });
    if (!res.ok) throw res.error;
    return res.value;
  };

  it("mevcut filtre yoksa her cümle yeni aramadır", async () => {
    const res = await parseVoiceQuery({ text: "Kocaeli'yi de ekle" }, { llm: false });
    expect(res.ok && res.value.mode).toBe("new");
  });

  it("'de ekle' mevcut seçime ekler", async () => {
    const r = await refine("Kocaeli'yi de ekle");
    expect(r.mode).toBe("refine");
    expect(r.params).toEqual({ il: "İstanbul,Kocaeli", kategori: "hafriyat", marka: "JCB,Hidromek" });
    expect(r.changes?.added.map((c) => c.label)).toEqual(["Kocaeli"]);
    expect(r.changes?.removed).toEqual([]);
  });

  it("'bir de forklift' kategori ekler", async () => {
    const r = await refine("bir de forklift olsun");
    expect(r.params.kategori).toBe("hafriyat,forklift");
  });

  it("çıkarma: marka, bağlaçla birden çok değer", async () => {
    expect((await refine("JCB'yi çıkar")).params.marka).toBe("Hidromek");
    expect((await refine("JCB ve Hidromek'i kaldır")).params.marka).toBeUndefined();
    const r = await refine("JCB olmasın");
    expect(r.mode).toBe("refine");
    expect(r.changes?.removed.map((c) => c.label)).toEqual(["JCB"]);
  });

  it("README örneği: ekleme ve olumsuzluk aynı cümlede", async () => {
    const r = await refine("Kocaeli'yi de ekle, JCB olmasın");
    expect(r.mode).toBe("refine");
    expect(r.params).toEqual({ il: "İstanbul,Kocaeli", kategori: "hafriyat", marka: "Hidromek" });
    expect(r.changes).toEqual({
      added: [{ param: "il", value: "Kocaeli", label: "Kocaeli" }],
      removed: [{ param: "marka", value: "JCB", label: "JCB" }],
    });
  });

  it("'yerine' biri çıkar biri girer", async () => {
    const r = await refine("İstanbul yerine İzmir");
    expect(r.mode).toBe("refine");
    expect(r.params.il).toBe("İzmir");
  });

  it("'sadece' o boyutu değiştirir", async () => {
    expect((await refine("sadece Hidromek")).params.marka).toBe("Hidromek");
  });

  it("fiyat düzenlemesi", async () => {
    const r = await refine("fiyat 10 binin altında olsun");
    expect(r.mode).toBe("refine");
    expect(r.params).toEqual({ ...current, maxFiyat: "10000" });
  });

  it("yalın 'de' ekleme işareti sayılmaz (STT bulunma ekini ayrı yazabilir)", async () => {
    const r = await refine("İzmir de kepçe");
    expect(r.mode).toBe("new");
  });

  it("yalnız niteleyici söylenirse düzenlemedir", async () => {
    const r = await refine("operatörlü olsun en ucuza göre sırala");
    expect(r.mode).toBe("refine");
    expect(r.params).toEqual({ ...current, operator: "operatorlu", sirala: "fiyat-artan" });
  });

  it("yeni bir makine/yer söylenirse yeni aramadır", async () => {
    const r = await refine("Ankara'da forklift");
    expect(r.mode).toBe("new");
    expect(r.params).toEqual({ il: "Ankara", kategori: "forklift" });
    expect(r.changes).toBeUndefined();
  });

  it("'yeni arama' ve 'filtreleri temizle'", async () => {
    expect((await refine("yeni arama forklift")).params).toEqual({ kategori: "forklift" });
    const cleared = await refine("filtreleri temizle");
    expect(cleared.mode).toBe("refine");
    expect(cleared.params).toEqual({});
    expect(cleared.changes?.removed.length).toBe(4);
  });

  it("seçili alt türlerin hepsi çıkarılınca kategori de çıkar", async () => {
    const r = await refine("kepçeyi çıkar", { kategori: "hafriyat,forklift", altKategori: "beko-loder" });
    expect(r.params).toEqual({ kategori: "forklift" });
  });

  it("ilçe yalın adla çıkarılır; bağlamdaki ilin ilçesi eklenir", async () => {
    const cur = { il: "Ankara,Bursa", ilce: "Ankara/Çankaya" };
    expect((await refine("Çankaya'yı çıkar", cur)).params).toEqual({ il: "Ankara,Bursa" });
    // Yenişehir üç ilde var; düzenlenen aramada Bursa seçili.
    expect((await refine("Yenişehir'i de ekle", cur)).params.ilce).toBe("Ankara/Çankaya,Bursa/Yenişehir");
  });

  it("ölçü bağlamdaki tek kategorinin alanına bağlanır", async () => {
    const r = await refine("20 tonluk olsun", { kategori: "hafriyat", altKategori: "paletli-ekskavator" });
    expect(r.params.spec_operasyonAgirligi).toBe("20");
  });

  it("sesin modellemediği filtreler korunur, sayfa atılır", async () => {
    const r = await refine("operatörlü olsun", { kategori: "forklift", fotografli: "1", sayfa: "3" });
    expect(r.params).toEqual({ kategori: "forklift", fotografli: "1", operator: "operatorlu" });
  });

  it("geçersiz mevcut parametreler süzülür", async () => {
    const r = await refine("operatörlü olsun", { kategori: "forklift", altKategori: "beko-loder", uydurma: "x" });
    expect(r.params).toEqual({ kategori: "forklift", operator: "operatorlu" });
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

describe("söylenen hiçbir şey atılmaz", () => {
  it("serbest kelime ve model kodu q olarak kalır, çip olarak görünür", async () => {
    const res = await parseVoiceQuery({ text: "İstanbul hidrolik kırıcı" }, { llm: false });
    if (!res.ok) throw res.error;
    expect(res.value.params).toEqual({ il: "İstanbul", q: "hidrolik kırıcı" });
    expect(res.value.chips.map((c) => c.param)).toEqual(["il", "q"]);
    const code = await parseVoiceQuery({ text: "JCB 3CX" }, { llm: false });
    expect(code.ok && code.value.params).toEqual({ marka: "JCB", q: "3CX" });
  });

  it("düzenlemede de listede olmayan marka korunur", async () => {
    const res = await parseVoiceQuery({ text: "Scania da ekle", current: { kategori: "forklift" } }, { llm: false });
    expect(res.ok && res.value.params).toEqual({ kategori: "forklift", marka: "Scania" });
  });
});
