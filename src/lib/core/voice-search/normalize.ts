/**
 * Sesli arama metni normalleştirme.
 *
 * Konuşma tanıyıcılar (Web Speech, iOS/Android) aynı cümleyi farklı yazar:
 * "İstanbul'da", "istanbulda", "Istanbul da"; "ekskavatör", "eskavatör". Eşleme
 * bu yüzden ham metin üzerinde değil, KARŞILAŞTIRMA ANAHTARI üzerinde yapılır:
 * Türkçe küçük harf + aksan katlama + birkaç kanonik yazım. Görünen değerler
 * (il adı, marka) her zaman taksonomideki orijinal yazımıyla döner.
 *
 * Saf modül: veri kaynağı import etmez.
 */

const FOLD: Record<string, string> = {
  ç: "c",
  ğ: "g",
  ı: "i",
  ö: "o",
  ş: "s",
  ü: "u",
  â: "a",
  î: "i",
  û: "u",
};

/** Bazı kelimelerin STT ve yazım varyantlarını tek biçime indirir. */
const CANONICAL: Record<string, string> = {
  makina: "makine",
  makinasi: "makine",
  makinesi: "makine",
  makinalari: "makine",
  makineleri: "makine",
  makinalar: "makine",
  makineler: "makine",
  eskavator: "ekskavator",
  excavator: "ekskavator",
  ekskavatoru: "ekskavator",
  ekskavatorler: "ekskavator",
  escavator: "ekskavator",
};

/** Türkçe küçük harf + aksan katlama. "İstanbul" → "istanbul", "Çukurova" → "cukurova". */
export function fold(s: string): string {
  return s
    .toLocaleLowerCase("tr")
    .replace(/[çğıöşüâîû]/g, (ch) => FOLD[ch] ?? ch)
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "");
}

/** Tek kelimenin karşılaştırma anahtarı. */
export function wordKey(word: string): string {
  const k = fold(word);
  return CANONICAL[k] ?? k;
}

/** Çok kelimeli bir ifadenin (taksonomi adı, eş anlamlı) anahtarı. */
export function phraseKey(phrase: string): string {
  return tokenize(phrase)
    .map((t) => t.key)
    .join(" ");
}

export interface Token {
  /** Kullanıcının söylediği biçim — `q` olarak geri döner ("3CX"). */
  raw: string;
  /** Karşılaştırma anahtarı. Sayı birleştirmesinden sonra rakamdır. */
  key: string;
  /** Sayı ise değeri. */
  num?: number;
}

const ONES: Record<string, number> = {
  sifir: 0,
  bir: 1,
  iki: 2,
  uc: 3,
  dort: 4,
  bes: 5,
  alti: 6,
  yedi: 7,
  sekiz: 8,
  dokuz: 9,
  on: 10,
  yirmi: 20,
  otuz: 30,
  kirk: 40,
  elli: 50,
  altmis: 60,
  yetmis: 70,
  seksen: 80,
  doksan: 90,
};
const MULTIPLIERS: Record<string, number> = { yuz: 100, bin: 1000, milyon: 1_000_000 };

/**
 * Metni belirteçlere ayırır.
 *
 * - Kesme işaretli ek atılır: "İstanbul'da" → "İstanbul", "TL'ye" → "TL".
 * - Binlik ayırıcı nokta kaldırılır: "5.000" → "5000".
 * - Sayı kelimeleri ve "5 bin" gibi diziler tek sayıya birleştirilir.
 */
export function tokenize(text: string): Token[] {
  const cleaned = text
    .replace(/([\p{L}\p{N}]+)['’`´][\p{L}]+/gu, "$1")
    .replace(/(\d)[.,](?=\d{3}(?!\d))/g, "$1")
    // Ondalık: "1,5 ton" → "1.5". Nokta yalnız iki rakam arasında kalır.
    .replace(/(\d),(\d)/g, "$1.$2")
    .replace(/[^\p{L}\p{N}.]+/gu, " ")
    .replace(/(?<!\d)\.|\.(?!\d)/g, " ")
    .trim();
  if (!cleaned) return [];

  const words = cleaned.split(/\s+/).flatMap((raw) => splitNumberSuffix({ raw, key: wordKey(raw) }));
  return mergeNumbers(words);
}

/** Sayıdan ayrılan hâl ekleri. Kalıplar anlamı bunlardan okur ("5 binden ucuz"). */
const NUMBER_SUFFIXES = ["den", "dan", "ten", "tan", "lik", "luk", "ye", "ya", "e", "a"];

/**
 * Ekli sayıyı sayı + ek olarak böler: "binden" → "bin" "den", "5000den" →
 * "5000" "den". Aksi hâlde "5 binden ucuz" birleşmez, "5" serbest metne düşerdi.
 *
 * Yalnız çarpanlar (bin/yüz/milyon) ve rakamlar bölünür: "ikiye", "beşte" gibi
 * biçimler fiyat kalıbında geçmez, "beste" gibi kelimeleri bozmak riskine değmez.
 * Rakamda tek harfli ek bölünmez — "210a" bir model kodu olabilir.
 */
function splitNumberSuffix(w: { raw: string; key: string }): { raw: string; key: string }[] {
  const digit = /^(\d+)([a-z]+)$/.exec(w.key);
  if (digit && digit[2].length >= 2 && NUMBER_SUFFIXES.includes(digit[2])) {
    return [
      { raw: digit[1], key: digit[1] },
      { raw: digit[2], key: digit[2] },
    ];
  }
  if (w.key in MULTIPLIERS) return [w];
  for (const s of NUMBER_SUFFIXES) {
    const stem = w.key.slice(0, -s.length);
    if (w.key.endsWith(s) && stem in MULTIPLIERS) {
      return [
        { raw: w.raw.slice(0, stem.length), key: stem },
        { raw: w.raw.slice(stem.length), key: s },
      ];
    }
  }
  return [w];
}

/** "on tonluk", "on metre": birimden önce "on" sayıdır (ön/on karışması olmaz). */
const UNIT_AFTER_ON = /^(?:ton|kilo|kg|kva|metre|mt|m|m3|kup|metrekup|beygir|hp|bg)/;

function numericValue(key: string): { kind: "digit" | "ones" | "mult"; value: number } | null {
  if (/^\d+$/.test(key)) return { kind: "digit", value: Number(key) };
  if (key in ONES) return { kind: "ones", value: ONES[key] };
  if (key in MULTIPLIERS) return { kind: "mult", value: MULTIPLIERS[key] };
  return null;
}

/**
 * Ardışık sayı belirteçlerini birleştirir: "beş bin" → 5000, "iki yüz elli" → 250,
 * "5 bin" → 5000. Tek başına "bir" sayı sayılmaz ("bir kepçe" bir dolgu kelimesidir),
 * tek başına "on" da sayılmaz (Türkçede "ön" ile karışır, STT aksanı düşürebilir).
 */
function mergeNumbers(words: { raw: string; key: string }[]): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < words.length) {
    const first = numericValue(words[i].key);
    // Sayının hemen ardındaki "altı" ayrı bir 6 değil, "altında"dır (bkz. aşağıda).
    const belowAfterNumber = words[i].key === "alti" && out.length > 0 && out[out.length - 1].num !== undefined;
    if (!first || belowAfterNumber) {
      out.push(words[i]);
      i++;
      continue;
    }

    let j = i;
    let total = 0;
    let current = 0;
    while (j < words.length) {
      const n = numericValue(words[j].key);
      if (!n) break;
      // İki rakam dizisi yan yana ("320 2020") ayrı sayılardır.
      if (n.kind === "digit" && j > i) break;
      // Rakamın ardından yalnız çarpan gelir ("5 bin"). "5000 altı" 5006 değil,
      // "5000'in altı"dır; konuşma tanıyıcı rakamla yazdığı sayıyı kelimeyle sürdürmez.
      if (first.kind === "digit" && j > i && n.kind !== "mult") break;
      // "beş bin altı" → yine "altında": ardından başka sayı gelmeyen "altı",
      // yüzlük bir tutarın sonuna eklenmez (5006 TL'lik makine kiralanmaz).
      if (
        words[j].key === "alti" &&
        j > i &&
        total + current >= 100 &&
        !(j + 1 < words.length && numericValue(words[j + 1].key))
      ) {
        break;
      }
      if (n.kind === "mult") {
        if (n.value === 100) current = (current || 1) * 100;
        else {
          total += (current || 1) * n.value;
          current = 0;
        }
      } else {
        current += n.value;
      }
      j++;
    }

    const span = words.slice(i, j);
    // "sıfır" de tek başına sayı değil: "sıfır ekskavatör" ilanın durumudur.
    const unitNext = j < words.length && UNIT_AFTER_ON.test(words[j].key);
    const lone =
      span.length === 1 &&
      ["bir", "on", "sifir"].includes(span[0].key) &&
      !(span[0].key === "on" && unitNext);
    if (lone) {
      out.push(words[i]);
      i++;
      continue;
    }
    const value = total + current;
    out.push({ raw: span.map((w) => w.raw).join(" "), key: String(value), num: value });
    i = j;
  }
  return out;
}

/**
 * Sondaki çekim/yapım eklerini deneyerek olası kökleri döndürür (en uzun önce).
 * "istanbulda" → ["istanbulda", "istanbul"], "kepceler" → ["kepceler", "kepce"].
 * Kök en az 3 harf kalmalı; aksi halde "van"/"ordu" gibi kısa adlar bozulur.
 */
const SUFFIXES = [
  "lerden", "lardan", "lerde", "larda", "leri", "lari", "ndaki", "ndeki",
  "daki", "deki", "taki", "teki", "ndan", "nden", "nda", "nde",
  "dan", "den", "tan", "ten", "lar", "ler", "lik", "luk", "nin", "nun", "sin", "sun",
  "da", "de", "ta", "te", "li", "lu", "ya", "ye", "yi", "yu", "si", "su", "ni", "nu",
  "a", "e", "i", "u",
];

export function stems(key: string): string[] {
  const out = [key];
  for (const s of SUFFIXES) {
    if (key.length - s.length >= 3 && key.endsWith(s)) {
      const stem = key.slice(0, -s.length);
      if (!out.includes(stem)) out.push(stem);
    }
  }
  return out;
}
