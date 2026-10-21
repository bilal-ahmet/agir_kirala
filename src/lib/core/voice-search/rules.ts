/**
 * Kural tabanlı sesli arama ayrıştırıcısı. Ağ yok, DB yok, ~1 ms.
 *
 * Dört aşama, her biri eşlediği kelimeleri "tüketir" ki aynı kelime iki kez
 * yorumlanmasın:
 *   A) Çok kelimeli kalıplar: fiyat (aralık dahil), model yılı, ölçü, sıralama,
 *      operatör… İki seçenekli filtreler ardından gelen olumsuzlukla döner.
 *   B) Sözlük: en uzun ifade önce ("beko loder" tek parça, "beko" ayrı değil).
 *   C) Tek kelimelik kalıplar: yakıt. Sözlükten SONRA koşar, yoksa "elektrikli"
 *      kelimesi "elektrikli forklift" alt kategorisini bölerdi.
 *   D) Bulanık eşleme: kalan kelimelerde konuşma tanıma yazım hataları.
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
  // Konuşma dolgusu, hitap, selamlaşma: STT bunları da metne yazar.
  "acaba", "yani", "abi", "abla", "kardes", "kardesim", "usta", "hocam", "merhaba", "selam",
  "selamlar", "gunler", "iyi", "rica", "etsem", "ederim", "tamam", "peki", "evet", "falan", "filan",
  "ee", "eee", "hmm", "mm", "ii", "birlikte", "beraber", "daha", "cok", "biraz", "baya",
  // Nitelik sıfatları: ilan metninde aranırsa sonucu sıfırlar, filtre karşılıkları yok.
  "buyuk", "buyukce", "kucuk", "orta", "boy", "musait", "bos", "kaliteli", "saglam", "temiz",
  "bakimli", "guzel", "yeni", "eski", "hizli", "hizlica", "yakinim", "yakinimda", "yakinimdaki",
  "genis", "uzun", "kisa", "agir", "hafif", "az", "fazla",
  // Zaman: "salı günü lazım", "haftaya". Süre kalıpları ("3 gün") önce tüketir.
  "pazartesi", "sali", "carsamba", "persembe", "cuma", "cumartesi", "gun", "gunu", "haftaya", "haftasonu",
  // Sayıdan ayrılan hâl ekleri (bkz. normalize.ts → splitNumberSuffix).
  "den", "dan", "ten", "tan", "lik", "luk", "ya", "e", "a",
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
  "bakabil", "bakar", "kategori", "marka", "model", "ilan", "istedi", "istiyor",
];

/**
 * Olumsuzluk: bir filtreden SONRA gelir ("JCB olmasın", "nakliye istemiyorum",
 * "İstanbul hariç"). Görmezden gelinseydi kullanıcı istediğinin tam tersini
 * görürdü: "operatör istemiyorum" operatörlü ilanları getiriyordu.
 */
const NEGATOR_PREFIXES = [
  "olmasin", "olmayan", "istemiyo", "istemem", "istemez", "haric", "disinda", "degil", "olmadan",
];

function isNegator(key: string): boolean {
  return NEGATOR_PREFIXES.some((p) => key.startsWith(p));
}

function isFiller(key: string): boolean {
  // Eşleşmenin arkasında kalmayan olumsuzluk ("istemiyorum" tek başına) de q'ya girmez.
  if (isNegator(key)) return true;
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
function scan(
  ctx: Ctx,
  re: RegExp,
  apply: (m: RegExpExecArray, idx: number[]) => boolean,
  silent = false,
): void {
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
    if (apply(m as RegExpExecArray, idx)) {
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

/**
 * Birimsiz bir tutarın ardından bunlardan biri gelirse sayı fiyat değildir:
 * ölçü ("en az 20 ton"), model yılı ("en az 2015 model") ya da süre ("3 gün").
 */
const NOT_PRICE_AFTER =
  String.raw`(?! (?:ton[a-z]*|kilo[a-z]*|kg|kva[a-z]*|metre[a-z]*|mt|m|m3|kup|metrekup[a-z]*|beygir[a-z]*|hp|bg|` +
  String.raw`model[a-z]*|yil[a-z]*|sene[a-z]*|saat[a-z]*|gun[a-z]*|hafta[a-z]*|ay[a-z]*|sefer[a-z]*|tane|adet)(?![a-z0-9]))`;

/**
 * Eşleşmenin hemen ardındaki olumsuzluğu tüketir. Araya en fazla iki dolgu
 * girebilir: "JCB markası olmasın", "ikinci el olanları istemiyorum".
 */
function takeNegation(ctx: Ctx, last: number): boolean {
  for (let k = last + 1; k < ctx.tokens.length && k <= last + 3; k++) {
    if (ctx.used[k]) return false;
    const key = ctx.tokens[k].key;
    if (isNegator(key)) {
      ctx.used[k] = true;
      return true;
    }
    if (!isFiller(key)) return false;
  }
  return false;
}

// ───────── A) Çok kelimeli kalıplar ─────────

function phaseA(ctx: Ctx): void {
  const f = ctx.filters;

  const isYear = (n: number) => n >= 1980 && n <= MAX_YEAR + 1;
  // Birimsiz tutar ancak bu kadar büyükse fiyattır ("en fazla 50" bir fiyat değil).
  const price = (n: number) => n >= 100;
  const minPrice = (n: number) => price(n) && set(f, "minFiyat", n);
  const maxPrice = (n: number) => price(n) && set(f, "maxFiyat", n);

  // Aralık: "10 bin ile 20 bin arası", "2015 ile 2020 arası". İki ucu da yıl
  // gibiyse ve para birimi söylenmediyse model yılı aralığıdır. Tek sınırlı
  // kalıplardan ÖNCE koşar, yoksa uçlardan biri tek başına yakalanırdı.
  scan(
    ctx,
    /(\d+)(?: (?:tl|lira)[a-z]*)?(?: (?:ile|ve|ila))? (\d+)(?: (?:tl|lira)[a-z]*)? (?:arasi[a-z]*|aralig[a-z]*|aralik[a-z]*)/,
    (m) => {
      const [lo, hi] = [Number(m[1]), Number(m[2])].sort((a, b) => a - b);
      if (lo === hi) return false;
      const money = /tl|lira/.test(m[0]);
      if (!money && isYear(lo) && isYear(hi)) return set(f, "minYil", lo) && set(f, "maxYil", hi);
      if (!price(hi)) return false;
      return set(f, "minFiyat", lo) && set(f, "maxFiyat", hi);
    },
  );

  // Fiyat: önce alt sınır ("en az 5000 lira", "5000 liradan fazla"), sonra üst sınır.
  scan(
    ctx,
    /(?:en az|minimum|min|asgari) (\d+) (?:tl|lira)[a-z]*|(\d+) (?:tl|lira)[a-z]* (?:ve )?(?:ustu|uzeri|ustunde|uzerinde|fazla)/,
    (m) => set(f, "minFiyat", Number(m[1] ?? m[2])),
  );
  // Birimsiz: "en az 5000", "5 binden fazla". Ardından birim/yıl gelirse ölçü
  // ya da model yılıdır ("en az 20 ton", "en az 2015 model"), fiyat değil.
  scan(ctx, new RegExp(`(?:en az|minimum|asgari) (\\d+)${NOT_PRICE_AFTER}`), (m) => minPrice(Number(m[1])));
  scan(ctx, /(\d+)(?: (?:den|dan|ten|tan))? (?:fazla|yukari[a-z]*|pahali)/, (m) => minPrice(Number(m[1])));

  scan(
    ctx,
    /(?:(?:en fazla|en cok|maksimum|max|azami|butcem|butce) )?(\d+) (?:tl|lira)[a-z]*(?: (?:kadar|altinda|alti|asmayan|asmasin))?/,
    (m) => set(f, "maxFiyat", Number(m[1])),
  );
  scan(ctx, new RegExp(`(?:en fazla|en cok|maksimum|max|azami) (\\d+)${NOT_PRICE_AFTER}`), (m) => maxPrice(Number(m[1])));
  // "5 binden ucuz", "5000'den az", "5000 altı", "10 bine kadar".
  scan(ctx, /(\d+)(?: (?:den|dan|ten|tan))? (?:ucuz[a-z]*|az|asagi[a-z]*|dusuk)/, (m) => maxPrice(Number(m[1])));
  scan(ctx, /(\d+) (?:alti|altinda|altina|altindaki)/, (m) => maxPrice(Number(m[1])));
  scan(ctx, /(\d+)(?: (?:e|a|ye|ya))? kadar/, (m) => maxPrice(Number(m[1])));
  // Bütçe: "bütçem 10 bin", "10 bin bütçem var".
  scan(ctx, /butce[a-z]*(?: (?:var|olarak))? (\d+)|(\d+)(?: (?:tl|lira)[a-z]*)? (?:lik )?butce[a-z]*/, (m) =>
    maxPrice(Number(m[1] ?? m[2])),
  );

  // Model yılı: "2020 model", "2018 ve üzeri", "2018'den yeni", "2015 öncesi".
  const year = (key: "minYil" | "maxYil", y: number) => isYear(y) && set(f, key, y);
  scan(ctx, /((?:19|20)\d{2}) (?:model[a-z]*|yil[a-z]*)(?: (?:ve )?(?:uzeri|sonrasi|ustu|sonra|yukarisi))?/, (m) => year("minYil", Number(m[1])));
  scan(
    ctx,
    /((?:19|20)\d{2})(?: (?:den|dan|ten|tan))? (?:ve )?(?:daha )?(?:yeni|uzeri|sonra[a-z]*|ustu|yukari[a-z]*)/,
    (m) => year("minYil", Number(m[1])),
  );
  scan(
    ctx,
    /((?:19|20)\d{2})(?: (?:den|dan|ten|tan))? (?:ve )?(?:daha )?(?:eski|once[a-z]*)/,
    (m) => year("maxYil", Number(m[1])),
  );
  // Göreli: "son 5 yılın", "son 3 senelik". Bu yıl dahil N yıl.
  scan(ctx, /son (\d+) (?:yil[a-z]*|sene[a-z]*)/, (m) => {
    const n = Number(m[1]);
    return n >= 1 && n <= 40 && set(f, "minYil", MAX_YEAR - n + 1);
  });

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

  // İki seçenekli filtreler: ardından olumsuzluk gelirse değer tersine döner
  // ("ikinci el olmasın" → sıfır, "operatör istemiyorum" → operatörsüz).
  const binary = <K extends "durum" | "nakliye" | "operator">(key: K, value: VoiceFilters[K], opposite: VoiceFilters[K]) =>
    (_m: RegExpExecArray, idx: number[]) => set(f, key, takeNegation(ctx, idx[idx.length - 1]) ? opposite : value);

  // İlan durumu.
  scan(ctx, /ikinci el|2 el|2el/, binary("durum", "ikinci_el", "sifir"));
  scan(ctx, /sifir(?: km| ayarinda)?/, binary("durum", "sifir", "ikinci_el"));

  // Nakliye: olumsuzlar önce ("nakliye yok" → "nakliye" ile karışmasın).
  const NO_TRANSPORT = /nakliyesiz|nakliye (?:yok|haric|olmadan)|tasima (?:yok|haric)/;
  scan(ctx, NO_TRANSPORT, binary("nakliye", "yok" as TransportFilter, "var"));
  scan(ctx, /nakliye(?:li| dahil| ile| olsun)?|tasima dahil|tasimali/, binary("nakliye", "var" as TransportFilter, "yok"));

  // Operatör.
  scan(
    ctx,
    /operatorsuz|operator(?:u)? (?:olmadan|yok|haric)|soforsuz|kendim kullan[a-z]*/,
    binary("operator", "operatorsuz" as OperatorFilter, "operatorlu"),
  );
  scan(
    ctx,
    /operatorlu|operator(?:u)? (?:ile|dahil|olsun)|operatoru?yle|operatorle|operator|soforlu|sofor(?:u)?(?:yle| ile)|soforle/,
    binary("operator", "operatorlu" as OperatorFilter, "operatorsuz"),
  );

  // Periyot: "günlük", "aylığına", "3 aylık", "10 gün", "ayda", "günde".
  // Tek başına "hafta"/"ay" periyot değildir ("bu hafta lazım").
  const PERIOD: [RegExp, RentalPeriod][] = [
    [/\d+ saat[a-z]*|saatli[a-z]*|saati|saatte/, "saatlik"],
    [/\d+ gun[a-z]*|gunlu[a-z]*|gunde/, "gunluk"],
    [/\d+ hafta[a-z]*|haftali[a-z]*|haftada/, "haftalik"],
    [/\d+ ay(?:li[a-z]*|lig[a-z]*)?|ayli[a-z]*|ayda/, "aylik"],
    [/\d+ yil(?:li[a-z]*|lig[a-z]*)?|yilli[a-z]*|yilda|senelik|senede/, "yillik"],
    [/sefer bas[a-z]*|seferlik|tek sefer|\d+ sefer[a-z]*/, "sefer"],
  ];
  for (const [re, p] of PERIOD) scan(ctx, re, () => addUnique(f.periyot, p));

  // Miktar gürültüsü: "2 tane", "3 adet" — serbest metne sızmasın.
  scan(ctx, /\d+ (?:tane|adet)/, () => true, true);
}

// ───────── B) Sözlük eşleme ─────────

/** Sözlük eşleşmesi + cümledeki yeri (olumsuzluk ve sıra için). */
interface Match {
  entries: LexEntry[];
  start: number;
  end: number;
}

function phaseB(ctx: Ctx): Match[] {
  const lex = lexicon();
  const { tokens, used } = ctx;
  const matches: Match[] = [];

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
        matches.push({ entries: found, start: i, end: i + n - 1 });
        i += n - 1;
        break;
      }
    }
  }
  return matches;
}

// ───────── D) Bulanık eşleme (konuşma tanıma yazım hataları) ─────────

/**
 * Tek kelimelik kategori/alt kategori/marka adları. İl ve ilçeler bilerek
 * dışarıda: 970 ilçe adı gündelik kelimelere bir harf uzaklıkta çok sık düşer.
 * 6 harften kısa adlar da dışarıda ("genie" ~ "geniş", "dorse" ~ "dörse").
 */
let fuzzyPool: { key: string; entries: LexEntry[] }[] | null = null;

function fuzzyCandidates() {
  fuzzyPool ??= [...lexicon().entries]
    .filter(
      ([key, entries]) =>
        key.length >= 6 &&
        !key.includes(" ") &&
        !/\d/.test(key) &&
        entries.every((e) => e.kind === "kategori" || e.kind === "altKategori" || e.kind === "marka"),
    )
    .map(([key, entries]) => ({ key, entries }));
  return fuzzyPool;
}

/** Komşu harf yer değiştirmesini de tek hata sayan düzenleme uzaklığı (OSA). */
export function editDistance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
      }
    }
  }
  return d[a.length][b.length];
}

/**
 * Sözlükte bulunamayan kelimeyi en yakın ada bağlar: "forkilift" → forklift,
 * "jenaratör" → jeneratör, "kompürsör" → kompresör, "skania" → Scania.
 * 6–8 harfte 1, 9+ harfte 2 hataya izin verilir; yalnız TEK bir anlama en
 * yakın aday varsa kabul edilir (iki ada eşit uzaklıktaysa tahmin yapılmaz).
 * Her yazım hatasını eş anlamlı olarak tek tek eklemek bitmeyen bir iş olurdu.
 */
function phaseFuzzy(ctx: Ctx): Match[] {
  const out: Match[] = [];
  ctx.tokens.forEach((t, i) => {
    if (ctx.used[i] || t.key.length < 6 || /\d/.test(t.key) || isFiller(t.key)) return;
    let best = Infinity;
    let winners: LexEntry[][] = [];
    for (const stem of stems(t.key)) {
      if (stem.length < 6) continue;
      const allowed = stem.length >= 9 ? 2 : 1;
      for (const c of fuzzyCandidates()) {
        if (Math.abs(c.key.length - stem.length) > allowed) continue;
        const dist = editDistance(stem, c.key);
        if (dist > allowed || dist > best) continue;
        if (dist < best) {
          best = dist;
          winners = [];
        }
        winners.push(c.entries);
      }
    }
    const distinct = new Set(winners.map((w) => JSON.stringify(w)));
    if (winners.length && distinct.size === 1) {
      ctx.used[i] = true;
      out.push({ entries: winners[0], start: i, end: i });
    }
  });
  return out;
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
 *
 * Olumsuzlanan konum/kategori/marka ("JCB olmasın", "İstanbul hariç") hiç
 * uygulanmaz: aramada hariç tutma filtresi yok, geniş sonuç ters sonuçtan iyidir.
 */
function resolve(ctx: Ctx, sorted: Match[]): void {
  const f = ctx.filters;
  const lex = lexicon();
  const deferred: LexEntry[][] = [];
  // "kepçe veya ekskavatör": aynı kategoriden iki alt tür → alt tür seçilmez,
  // kategori kalır. Birini seçmek diğerini sessizce dışarıda bırakırdı.
  let subConflict = false;

  for (const { entries, end } of sorted) {
    if (takeNegation(ctx, end)) {
      ctx.recognized++;
      continue;
    }
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
      if (!f.altKategori && !subConflict) {
        f.altKategori = sub.slug;
        f.kategori = sub.category;
      } else if (f.altKategori && f.altKategori !== sub.slug && f.kategori === sub.category) {
        f.altKategori = undefined;
        subConflict = true;
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

/**
 * Kalan kelimelerden model kodlarını toplar. Konuşma tanıyıcı kodu bölebilir:
 * "3CX" → "3 CX", "PC210" → "PC 210". Rakamlı bir kelimeye BİTİŞİK 1–2 harflik
 * parçalar aynı koda katılır; aksi hâlde "JCB 3 CX" yalnız "3" diye aranırdı.
 */
function modelGroups(leftIdx: number[], word: (i: number) => string): string[] {
  const groups: string[][] = [];
  let cur: { idx: number; words: string[]; hasDigit: boolean } | null = null;
  const flush = () => {
    if (cur?.hasDigit) groups.push(cur.words);
    cur = null;
  };
  for (const i of leftIdx) {
    const w = word(i);
    const part = looksLikeModel(w) || /^\p{L}{1,2}$/u.test(w);
    if (!part) {
      flush();
      continue;
    }
    if (cur && cur.idx !== i - 1) flush();
    cur ??= { idx: i, words: [], hasDigit: false };
    cur.idx = i;
    cur.words.push(w);
    cur.hasDigit ||= looksLikeModel(w);
  }
  flush();
  return groups.map((g) => g.join(" "));
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
  const exact = phaseB(ctx);
  phaseC(ctx);
  // Bulanık eşleme en son: kalıplar ve sözlük tüketemediği kelimelere bakar.
  const fuzzy = phaseFuzzy(ctx);
  resolve(ctx, [...exact, ...fuzzy].sort((a, b) => a.start - b.start));
  resolveMeasures(ctx);

  const leftIdx = tokens.flatMap((t, i) => (!ctx.used[i] && !isFiller(t.key) ? [i] : []));
  const remainder = leftIdx.map((i) => tokens[i].raw);
  // Sözle söylenen sayı rakamla aranır: ilanda "üç yüz yirmi" değil "320" yazar.
  const searchable = (i: number) => (tokens[i].num !== undefined ? tokens[i].key : tokens[i].raw);
  const groups = modelGroups(leftIdx, (i) => searchable(i));
  const words = leftIdx.map(searchable).filter((w) => !looksLikeModel(w));

  if (groups.length === 1) {
    // Model kodu varsa yalnız onu ara: "JCB 3CX" → marka=JCB, q=3CX.
    ctx.filters.q = groups[0];
  } else if (!groups.length && words.length) {
    // Kod yoksa kalan kelimeler bugünkü metin aramasıyla aynı şekilde q olur.
    ctx.filters.q = words.join(" ");
  }
  // Birden çok ayrı kod ("3CX ve 4CX"): aramada "ya da" yok; ikisini birden
  // aramak hiçbir ilanla eşleşmezdi. q boş kalır, marka/kategori filtresi yeter.

  const low = (ctx.recognized === 0 && words.length > 0) || words.length >= 2;
  return {
    filters: ctx.filters,
    remainder,
    recognized: ctx.recognized,
    confidence: low ? "low" : "high",
  };
}
