/**
 * Kural tabanlı sesli arama ayrıştırıcısı. Ağ yok, DB yok, ~1 ms.
 *
 * Üç aşama, her biri eşlediği kelimeleri "tüketir" ki aynı kelime iki kez
 * yorumlanmasın:
 *   A) Çok kelimeli kalıplar: fiyat, model yılı, ölçü, sıralama, operatör…
 *   B) Sözlük: en uzun ifade önce ("beko loder" tek parça, "beko" ayrı değil).
 *   C) Tek kelimelik kalıplar: yakıt. Sözlükten SONRA koşar, yoksa "elektrikli"
 *      kelimesi "elektrikli forklift" alt kategorisini bölerdi.
 * Kalan anlamlı kelimeler `remainder` olur. Model kodları ("3CX", "PC210")
 * burada kalır ve serbest metin araması (q) olarak kullanılır.
 */

import { getCategory } from "../../categories";
import { MAX_YEAR } from "../../constants";
import type { FuelType, OperatorFilter, RentalPeriod, SortKey, TransportFilter } from "../../types";
import { lexicon, type LexEntry } from "./lexicon";
import { phraseKey, stems, tokenize, type Token } from "./normalize";
import { emptyFilters, type VoiceFilters } from "./types";

export interface RulesResult {
  filters: VoiceFilters;
  /** Hiçbir şeye eşlenmeyen, dolgu olmayan kelimeler (söylendiği biçimde). */
  remainder: string[];
  /** Kaç parça filtre tanındı. */
  recognized: number;
  /**
   * "low": anlaşılmayan anlamlı kelime kaldı; LLM yedeğine değer.
   * "high": her şey tanındı ya da kalanlar model kodu gibi görünüyor.
   */
  confidence: "high" | "low";
}

// ───────── Dolgu kelimeleri ─────────

const FILLERS = new Set([
  "kiralik", "kirada", "bana", "bize", "beni", "bir", "icin", "ile", "ve", "veya", "ya", "da", "de",
  "olan", "en", "is", "makine", "arac", "araci", "araclar", "ilan", "ilani", "ilanlar", "ilanlari",
  "goster", "gosterir", "listele", "bul", "bulur", "bulun", "ara", "arat", "musun", "misin", "mi", "mu",
  "lutfen", "acil", "hemen", "simdi", "bugun", "yarin", "sabah", "aksam", "hafta", "ay", "yil",
  "civar", "civari", "civarinda", "civarindaki", "yakin", "yakinda", "yakinlarda", "bolge", "bolgesinde",
  "il", "ili", "ilinde", "ilce", "ilcesi", "ilcesinde", "sehir", "sehrinde", "tane", "adet", "uygun",
  "fiyatli", "fiyat", "fiyatlar", "fiyati", "tl", "lira", "ye", "yi", "ne", "nerede", "var", "varmi",
  "sahibinden", "kiralayan", "santiye", "santiyem", "proje", "projem", "lazim", "gerek",
  "gerekli", "gerekiyor", "ihtiyac", "ihtiyacim", "istiyorum", "istiyoruz", "isterim", "ariyorum",
  "ariyoruz", "bakiyorum", "bakiyoruz", "model", "marka", "kategori", "tip", "tipi", "turu",
  // İstek fiilleri ve bağlaçlar: "… getir", "… olsun", "hepsini göster".
  "ver", "verir", "verin", "versene", "ac", "olsun", "olsa", "olmali", "gelsin", "gor", "goreyim",
  "gorelim", "bakalim", "tum", "butun", "hepsi", "hepsini", "her", "sadece", "yalniz", "yalnizca",
  "gibi", "olarak", "gore", "cesit", "cesitli", "secenek", "secenekler", "secenekleri", "sey",
]);

/**
 * Ekli biçimleri de dolgu olan kökler. Tam eşleşme yetmiyordu: "tır
 * kategorisinde Mercedes ve Volvo markalarını getir" cümlesinde
 * "kategorisinde", "markalarını" ve "getir" serbest metin aramasına (q)
 * sızıyor, sonuç sıfıra düşüyordu. Kök kısa ve belirsizse (ör. "ara" →
 * "araba") buraya girmez, FILLERS'ta tam biçimiyle durur.
 */
const FILLER_PREFIXES = [
  "kirala", "kiraliy", "istiyo", "ariyo", "bakiyo", "gerekiy", "lazim",
  "getir", "goster", "listele", "sirala", "bulabil", "bulur", "bulsa", "arayabil", "aratabil",
  "bakabil", "bakar", "kategori", "marka", "model", "ilan",
];

function isFiller(key: string): boolean {
  if (FILLER_PREFIXES.some((p) => key.startsWith(p))) return true;
  // "makineleri", "araçları", "modeli": ek alınınca dolgu köküne iner.
  return stems(key).some((s) => FILLERS.has(s));
}

// ───────── Kalıp altyapısı ─────────

interface Measure {
  value: number;
  unit: "ton" | "kg" | "kVA" | "m" | "HP" | "m³";
  label: string;
}

interface Ctx {
  tokens: Token[];
  used: boolean[];
  filters: VoiceFilters;
  recognized: number;
  /** Kategori bilinmeden çözülemeyen ölçüler ("20 tonluk"). */
  measures: Measure[];
}

/**
 * Anahtar dizisi üzerinde regex çalıştırır; eşleşmenin kapsadığı belirteçler
 * daha önce tüketilmemişse `apply` çağrılır ve belirteçler tüketilir.
 * `apply` false dönerse (ör. geçersiz yıl) hiçbir şey tüketilmez.
 * `silent`: tüketir ama tanınan filtre saymaz ("3 tane" gibi gürültü).
 */
function scan(ctx: Ctx, re: RegExp, apply: (m: RegExpExecArray) => boolean, silent = false): void {
  const starts: number[] = [];
  let text = "";
  ctx.tokens.forEach((t, i) => {
    if (i) text += " ";
    starts.push(text.length);
    text += t.key;
  });
  const global = new RegExp(`(?<![a-z0-9.])(?:${re.source})(?![a-z0-9])`, "g");
  for (const m of text.matchAll(global)) {
    const from = m.index;
    const to = from + m[0].length;
    const idx: number[] = [];
    starts.forEach((s, i) => {
      const e = s + ctx.tokens[i].key.length;
      if (s < to && e > from) idx.push(i);
    });
    if (!idx.length || idx.some((i) => ctx.used[i])) continue;
    if (apply(m as RegExpExecArray)) {
      for (const i of idx) ctx.used[i] = true;
      if (!silent) ctx.recognized++;
    }
  }
}

function set<K extends keyof VoiceFilters>(f: VoiceFilters, key: K, value: VoiceFilters[K]): boolean {
  if (f[key] === undefined) f[key] = value;
  return true;
}

function addUnique<T>(list: T[], v: T): boolean {
  if (!list.includes(v)) list.push(v);
  return true;
}

const NUM = String.raw`(\d+(?:\.\d+)?)`;

// ───────── A) Çok kelimeli kalıplar ─────────

function phaseA(ctx: Ctx): void {
  const f = ctx.filters;

  // Fiyat: önce alt sınır ("en az 5000 lira", "5000 liradan fazla"), sonra üst sınır.
  scan(
    ctx,
    /(?:en az|minimum|min|asgari) (\d+) (?:tl|lira)[a-z]*|(\d+) (?:tl|lira)[a-z]* (?:ve )?(?:ustu|uzeri|ustunde|uzerinde|fazla)/,
    (m) => set(f, "minFiyat", Number(m[1] ?? m[2])),
  );
  scan(
    ctx,
    /(?:(?:en fazla|en cok|maksimum|max|azami|butcem|butce) )?(\d+) (?:tl|lira)[a-z]*(?: (?:kadar|altinda|alti|asmayan|asmasin))?/,
    (m) => set(f, "maxFiyat", Number(m[1])),
  );

  // Model yılı: "2020 model", "2018 ve üzeri", "2019 yılı sonrası".
  const year = (y: number) => {
    if (y < 1980 || y > MAX_YEAR + 1) return false;
    return set(f, "minYil", y);
  };
  scan(ctx, /((?:19|20)\d{2}) (?:model[a-z]*|yil[a-z]*)(?: (?:ve )?(?:uzeri|sonrasi|ustu|sonra|yukarisi))?/, (m) => year(Number(m[1])));
  scan(ctx, /((?:19|20)\d{2}) (?:ve )?(?:uzeri|sonrasi|ustu|sonra|yukarisi)/, (m) => year(Number(m[1])));

  // Ölçüler: "20 tonluk", "500 kVA", "16 metre", "1.5 metreküp". Hangi teknik
  // alana denk geldiği kategoriye bağlı; kategori bilinince çözülür.
  const UNITS: [RegExp, Measure["unit"]][] = [
    [/ton(?:luk|lu|lik)?|t/, "ton"],
    [/kg|kilo(?:luk|gram[a-z]*)?/, "kg"],
    [/kva(?:lik|li)?|kilovolt[a-z]*/, "kVA"],
    [/metrekup[a-z]*|m3|kup/, "m³"],
    [/metre(?:lik|li)?|mt|m/, "m"],
    [/beygir[a-z]*|hp|bg/, "HP"],
  ];
  for (const [re, unit] of UNITS) {
    scan(ctx, new RegExp(`${NUM} (?:${re.source})`), (m) => {
      const value = Number(m[1]);
      if (!Number.isFinite(value) || value <= 0) return false;
      ctx.measures.push({ value, unit, label: `${m[1]} ${unit}` });
      return true;
    }, true);
  }

  // Sıralama. "son model" model yılına, "en yeni" ilan tarihine göredir.
  const sort = (k: SortKey) => set(f, "sirala", k);
  scan(ctx, /(?:en yeni|son|yeni) model[a-z]*/, () => sort("yil-yeni"));
  scan(ctx, /en ucuz[a-z]*|ucuz[a-z]*|en uygun[a-z]*|uygun fiyatli/, () => sort("fiyat-artan"));
  scan(ctx, /en pahali[a-z]*|pahalidan ucuza/, () => sort("fiyat-azalan"));
  scan(ctx, /en yeni(?: ilan[a-z]*)?|yeni ilan[a-z]*|son eklenen[a-z]*|yeni eklenen[a-z]*/, () => sort("yeni"));
  scan(ctx, /(?:en )?az kullanilmis|dusuk (?:saat|kilometre|km)[a-z]*/, () => sort("kullanim-az"));
  scan(ctx, /(?:en )?(?:iyi|yuksek) puan[a-z]*|en guvenilir[a-z]*/, () => sort("puan"));

  // İlan durumu.
  scan(ctx, /ikinci el|2 el|2el/, () => set(f, "durum", "ikinci_el"));
  scan(ctx, /sifir(?: km| ayarinda)?/, () => set(f, "durum", "sifir"));

  // Nakliye: olumsuzlar önce ("nakliye yok" → "nakliye" ile karışmasın).
  const nakliye = (v: TransportFilter) => set(f, "nakliye", v);
  scan(ctx, /nakliyesiz|nakliye (?:yok|haric|olmadan)|tasima (?:yok|haric)/, () => nakliye("yok"));
  scan(ctx, /nakliye(?:li| dahil| ile| olsun)?|tasima dahil|tasimali/, () => nakliye("var"));

  // Operatör.
  const operator = (v: OperatorFilter) => set(f, "operator", v);
  scan(ctx, /operatorsuz|operator(?:u)? (?:olmadan|yok|haric)|soforsuz|kendim kullan[a-z]*/, () => operator("operatorsuz"));
  scan(ctx, /operatorlu|operator(?:u)? (?:ile|dahil|olsun)|operatoruyle|operator|soforlu/, () => operator("operatorlu"));

  // Periyot: "günlük", "aylığına", "3 aylık", "10 gün".
  const PERIOD: [RegExp, RentalPeriod][] = [
    [/\d+ saat[a-z]*|saatli[a-z]*/, "saatlik"],
    [/\d+ gun[a-z]*|gunlu[a-z]*/, "gunluk"],
    [/\d+ hafta[a-z]*|haftali[a-z]*/, "haftalik"],
    [/\d+ ay(?:li[a-z]*|lig[a-z]*)?|ayli[a-z]*/, "aylik"],
    [/\d+ yil(?:li[a-z]*|lig[a-z]*)?|yilli[a-z]*/, "yillik"],
    [/sefer bas[a-z]*|seferlik|tek sefer|\d+ sefer[a-z]*/, "sefer"],
  ];
  for (const [re, p] of PERIOD) scan(ctx, re, () => addUnique(f.periyot, p));

  // Miktar gürültüsü: "2 tane", "3 adet" — serbest metne sızmasın.
  scan(ctx, /\d+ (?:tane|adet)/, () => true, true);
}

// ───────── B) Sözlük eşleme ─────────

function phaseB(ctx: Ctx): void {
  const lex = lexicon();
  const { tokens, used } = ctx;
  const matches: LexEntry[][] = [];

  for (let i = 0; i < tokens.length; i++) {
    if (used[i]) continue;
    for (let n = Math.min(lex.maxWords, tokens.length - i); n >= 1; n--) {
      if (tokens.slice(i, i + n).some((_, k) => used[i + k])) continue;
      const head = tokens.slice(i, i + n - 1).map((t) => t.key);
      let found: LexEntry[] | undefined;
      for (const stem of stems(tokens[i + n - 1].key)) {
        found = lex.entries.get([...head, stem].join(" "));
        if (found) break;
      }
      if (found) {
        for (let k = 0; k < n; k++) used[i + k] = true;
        matches.push(found);
        i += n - 1;
        break;
      }
    }
  }

  resolve(ctx, matches);
}

function first<K extends LexEntry["kind"]>(list: LexEntry[], kind: K) {
  return list.find((e): e is Extract<LexEntry, { kind: K }> => e.kind === kind);
}

/**
 * Eşleşmeleri filtrelere çevirir.
 *
 * Aynı ifade birden fazla anlama gelebilir: "Çukurova" hem marka hem Adana'nın
 * ilçesi, "Bobcat" hem marka hem alt kategori, "Yenişehir" üç ilin ilçesi.
 * İlçe kararı il bilindikten SONRA verilir; kullanıcı "Çankaya Ankara" gibi ili
 * sonra da söyleyebilir.
 */
function resolve(ctx: Ctx, matches: LexEntry[][]): void {
  const f = ctx.filters;
  const lex = lexicon();
  const deferred: LexEntry[][] = [];

  for (const entries of matches) {
    const il = first(entries, "il");
    const sub = first(entries, "altKategori");
    const cat = first(entries, "kategori");
    const ilce = first(entries, "ilce");
    const brand = first(entries, "marka");

    if (il) {
      set(f, "il", il.value);
    } else if (sub) {
      // Alt kategori kategoriyi belirler; önce yalnız kategori söylendiyse
      // ("vinç … hiyap") daha özel olan kazanır.
      if (!f.altKategori) {
        f.altKategori = sub.slug;
        f.kategori = sub.category;
      }
    } else if (cat) {
      set(f, "kategori", cat.slug);
    } else if (ilce) {
      deferred.push(entries);
      continue;
    } else if (brand) {
      addUnique(f.marka, brand.value);
    } else {
      continue;
    }
    ctx.recognized++;
  }

  for (const entries of deferred) {
    const ilce = first(entries, "ilce")!;
    const brand = first(entries, "marka");
    if (f.il && ilce.provinces.includes(f.il)) {
      set(f, "ilce", ilce.value);
    } else if (
      !f.il &&
      !brand &&
      ilce.provinces.length === 1 &&
      !lex.commonWordDistricts.has(phraseKey(ilce.value))
    ) {
      f.il = ilce.provinces[0];
      f.ilce = ilce.value;
    } else if (brand) {
      addUnique(f.marka, brand.value);
    } else {
      // Belirsiz yer adı ("Merkez", birden çok ilde olan ilçe): yok sayılır.
      // Serbest metin aramasına girseydi sonuçları bozardı.
      continue;
    }
    ctx.recognized++;
  }
}

// ───────── C) Tek kelimelik kalıplar ─────────

function phaseC(ctx: Ctx): void {
  const FUEL: [RegExp, FuelType][] = [
    [/dizel|mazotlu/, "dizel"],
    [/benzinli/, "benzin"],
    [/elektrikli|akulu/, "elektrik"],
    [/lpg[a-z]*/, "lpg"],
    [/hibrit/, "hibrit"],
  ];
  for (const [re, fuel] of FUEL) scan(ctx, re, () => addUnique(ctx.filters.yakit, fuel));
}

/**
 * Ölçüleri kategorinin filtrelenebilir teknik alanına bağlar.
 * "20 tonluk ekskavatör" → spec_operasyonAgirligi=20,
 * "3 tonluk forklift" → spec_kaldirmaKapasitesi=3000 (alan kg cinsinden).
 * Kategori bilinmiyorsa ölçü atılır: tek başına anlamı yok.
 */
function resolveMeasures(ctx: Ctx): void {
  const f = ctx.filters;
  const fields = (getCategory(f.kategori)?.specFields ?? []).filter(
    (s) => s.filterable && s.type === "number",
  );
  for (const m of ctx.measures) {
    const candidates = fields
      .map((s) => {
        if (s.unit === m.unit) return { s, value: m.value };
        if (s.unit === "kg" && m.unit === "ton") return { s, value: m.value * 1000 };
        if (s.unit === "ton" && m.unit === "kg") return { s, value: m.value / 1000 };
        return null;
      })
      .filter((x) => x !== null);
    // Platformlarda "16 metre" çalışma yüksekliğidir, bom uzunluğu değil.
    const pick = candidates.find((c) => c.s.key === "calismaYuksekligi") ?? candidates[0];
    if (pick && !(pick.s.key in f.specs)) {
      f.specs[pick.s.key] = pick.value;
      ctx.recognized++;
    }
  }
}

// ───────── Giriş noktası ─────────

/** Model kodu gibi görünen kelime: rakam içerir ("3CX", "320", "PC210"). */
export function looksLikeModel(word: string): boolean {
  return /\d/.test(word);
}

export function parseWithRules(text: string): RulesResult {
  const tokens = tokenize(text);
  const ctx: Ctx = {
    tokens,
    used: tokens.map(() => false),
    filters: emptyFilters(),
    recognized: 0,
    measures: [],
  };

  phaseA(ctx);
  phaseB(ctx);
  phaseC(ctx);
  resolveMeasures(ctx);

  const left = tokens.filter((t, i) => !ctx.used[i] && !isFiller(t.key));
  const remainder = left.map((t) => t.raw);
  // Sözle söylenen sayı rakamla aranır: ilanda "üç yüz yirmi" değil "320" yazar.
  const searchable = left.map((t) => (t.num !== undefined ? t.key : t.raw));
  const words = searchable.filter((w) => !looksLikeModel(w));
  const models = searchable.filter(looksLikeModel);

  if (searchable.length) {
    // Model kodu varsa yalnız onu ara: "JCB 3CX" → marka=JCB, q=3CX. Kod yoksa
    // kalan kelimeler bugünkü metin aramasıyla aynı şekilde q olur.
    ctx.filters.q = (models.length ? models : searchable).join(" ");
  }

  const low = (ctx.recognized === 0 && words.length > 0) || words.length >= 2;
  return {
    filters: ctx.filters,
    remainder,
    recognized: ctx.recognized,
    confidence: low ? "low" : "high",
  };
}
