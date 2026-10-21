/**
 * Sesli arama sözlüğü.
 *
 * İller, ilçeler, kategoriler ve markalar TEK KAYNAKTAN (locations / categories /
 * brands) modül yüklenirken bir kez üretilir. Elle tutulan tek veri, insanların
 * makinelere taksonomideki adla değil gündelik adla seslenmesinden doğan
 * eş anlamlılar ("kepçe" → Beko Loder) ve markaların söyleniş biçimleridir.
 *
 * Yeni bir kategori/marka/il taksonomiye eklendiğinde burada hiçbir şey
 * değiştirmeye gerek yoktur; yalnız gündelik bir adı varsa SYNONYMS'e eklenir.
 */

import { CATEGORIES } from "../../categories";
import { ALL_BRANDS } from "../../brands";
import { PROVINCES } from "../../locations";
import { phraseKey } from "./normalize";

export type LexEntry =
  | { kind: "il"; value: string }
  | { kind: "ilce"; value: string; provinces: string[] }
  | { kind: "kategori"; slug: string }
  | { kind: "altKategori"; category: string; slug: string }
  | { kind: "marka"; value: string };

/**
 * Gündelik adlar. Anahtar kategori slug'ı ya da "kategori/altKategori".
 * Belirsiz gündelik adlar (ör. "silindir": asfalt mı toprak mı) kategori
 * düzeyine bağlanır; kullanıcı alt türü filtre panelinden daraltır.
 */
const SYNONYMS: Record<string, string[]> = {
  hafriyat: ["hafriyat", "hafriyat makine", "toprak isi", "kazi makine"],
  "hafriyat/beko-loder": ["kepce", "beko", "bekoloder", "beko loder", "kazici yukleyici"],
  "hafriyat/lastikli-yukleyici": ["loder", "loader", "lastikli loder", "yukleyici", "lastikli kepce"],
  "hafriyat/paletli-yukleyici": ["paletli loder", "paletli kepce"],
  "hafriyat/bobcat": ["bobcat", "bobket", "mini yukleyici", "mini loder", "mini kepce", "yavru kepce", "kucuk kepce"],
  "hafriyat/paletli-ekskavator": ["ekskavator", "paletli ekskavator", "paletli kazici", "kazici"],
  "hafriyat/paletli-mini-ekskavator": ["mini ekskavator", "mini kazici", "mini paletli", "kucuk ekskavator", "kucuk kazici"],
  "hafriyat/lastikli-ekskavator": ["lastikli ekskavator", "lastikli kazici"],

  "damperli-kamyon": ["kamyon", "damperli", "damperli kamyon", "damper", "hafriyat kamyonu"],
  "damperli-kamyon/10-teker": ["10 teker", "10 tekerli"],
  "damperli-kamyon/kirkayak": ["kirkayak", "kirk ayak", "8x4"],
  "damperli-kamyon/belden-kirma": ["belden kirma", "belden kirmali", "dumper"],
  "damperli-kamyon/mini": ["mini damper", "mini kamyon", "mini damperli"],

  // Tır. "Çekici" alt kategori adından otomatik gelir (Çekici (Dorsesiz)).
  // Tek başına "sal" eklenmedi: "salı" (gün) kökü de "sal"a iner.
  tir: ["tir", "tir kiralama", "dorse", "treyler", "yari romork"],
  "tir/tenteli": ["tenteli", "perdeli", "tenteli dorse", "perdeli dorse", "kuru yuk"],
  "tir/kapali-kasa": ["kapali kasa", "box", "kutu kasa", "kapali dorse"],
  "tir/frigorifik": ["frigo", "frigorifik", "sogutuculu", "sogutmali", "frigo dorse"],
  "tir/acik-kasa": ["acik kasa", "sal dorse", "sal tir", "platform dorse", "acik dorse"],
  "tir/lowbed": ["lowbed", "low bed", "lobet", "lobed", "lowbed dorse", "agir nakliye", "agir yuk"],
  "tir/damperli": ["damperli dorse", "damper dorse"],
  "tir/silobas": ["silobas", "silo", "silobas dorse"],
  "tir/tanker": ["tanker", "akaryakit tankeri", "yakit tankeri", "tanker dorse"],
  "tir/konteyner": ["konteyner", "konteyner tasiyici", "konteyner sasi", "sasi dorse"],
  "tir/oto-tasiyici": ["oto tasiyici", "arac tasiyici", "oto tasima", "arac tasima"],

  // Tek başına "pompa" bu sitede beton pompasıdır; alt türü (kamyon üstü/sabit) belirsiz.
  beton: ["beton", "beton makine", "beton pompasi", "beton pompa", "pompa"],
  "beton/beton-mikseri": ["mikser", "beton mikseri", "transmikser", "betoniyer"],
  "beton/kamyon-ustu-pompa": ["kamyon ustu pompa"],
  "beton/sabit-pompa": ["sabit pompa"],

  "asfalt-yol": ["asfalt", "yol makine", "silindir", "yol silindiri"],
  "asfalt-yol/dozer": ["dozer", "buldozer", "paletli dozer"],
  "asfalt-yol/greyder": ["greyder", "grayder", "greder", "greyder makine"],
  "asfalt-yol/finisher": ["finiser", "finisher", "asfalt serici"],
  "asfalt-yol/arazoz": ["arazoz", "su tankeri", "su arabasi", "sulama tankeri"],
  "asfalt-yol/asfalt-kazima": ["asfalt kazima", "freze", "asfalt freze"],
  "asfalt-yol/kaya-delici": ["kaya delici", "rok delici", "ankraj"],

  "vinc-platform": ["vinc", "platform", "manlift", "personel yukseltici", "yukseltici", "sepetli platform"],
  "vinc-platform/kule-vinc": ["kule vinci"],
  "vinc-platform/hiyap-vinc": ["hiyap", "hiab", "hiyab", "arac ustu vinc", "kamyon ustu vinc"],
  "vinc-platform/mobil-vinc": ["mobil vinc", "teleskopik vinc", "lastikli vinc"],
  "vinc-platform/sepetli-vinc": ["sepetli vinc", "sepetli arac", "sepetli kamyon"],
  "vinc-platform/orumcek-vinc": ["orumcek vinc"],
  "vinc-platform/paletli-vinc": ["paletli vinc"],
  "vinc-platform/makasli-platform": ["makasli platform", "makasli", "makas lift", "makasli lift"],
  "vinc-platform/eklemli-platform": ["eklemli platform", "eklemli manlift"],
  "vinc-platform/teleskopik-platform": ["teleskopik platform", "teleskopik manlift"],
  "vinc-platform/insaat-asansoru": ["insaat asansoru", "yuk asansoru", "santiye asansoru"],
  "vinc-platform/dis-cephe-platformu": ["dis cephe platformu", "cephe platformu", "asma iskele"],

  forklift: ["forklift", "fork lift", "forklif", "istif", "istif makine"],
  "forklift/telehandler": ["telehandler", "teleskopik yukleyici", "teleskopik forklift"],
  "forklift/elektrikli": ["elektrikli forklift", "akulu forklift"],
  "forklift/dizel": ["dizel forklift"],
  "forklift/akulu-transpalet": ["transpalet", "akulu transpalet", "elektrikli transpalet"],
  "forklift/akulu-istif": ["akulu istif"],
  "forklift/reach-truck": ["reach truck", "rich truck"],

  jenerator: ["jenerator", "elektrik jeneratoru", "guc kaynagi"],
  "jenerator/kompresor": ["kompresor", "hava kompresoru"],
  "jenerator/aydinlatma-kulesi": ["aydinlatma kulesi", "isik kulesi", "projektor kulesi"],
  "jenerator/romorklu": ["romorklu jenerator"],
  "jenerator/portatif-benzinli": ["benzinli jenerator"],
};

/** Markaların söyleniş/STT biçimleri. Değer, ALL_BRANDS'teki yazımdır. */
const BRAND_ALIASES: Record<string, string[]> = {
  JCB: ["jisibi", "jesibi", "cicibi", "ce ce be", "jey si bi"],
  Caterpillar: ["cat", "katerpilar", "katerpiller", "caterpiler"],
  Hidromek: ["hidromak"],
  Komatsu: ["komatzu"],
  Hyundai: ["hundai", "hunday"],
  Liebherr: ["libher", "liebher", "libherr"],
  Doosan: ["dusan"],
  SANY: ["sani"],
  XCMG: ["x c m g", "iks ce me ge"],
  Manitou: ["manitu"],
  "Mercedes-Benz": ["mercedes", "mersedes", "benz"],
  "Atlas Copco": ["atlas kopko"],
  "New Holland": ["nyu holland", "new holand"],
  "John Deere": ["con dir", "john dir"],
  Bobcat: ["bobket"],
  Haulotte: ["olot", "holot"],
  Genie: ["cini"],
  Takeuchi: ["takeuci"],
};

/**
 * Tek başına söylendiğinde ilçe sayılmayacak gündelik kelimeler. Bunlar Türkçede
 * çok sık geçer ("Merkez", "Kale", "Çay", "Orta", "Pazar") ve ilçe olarak
 * yorumlanmaları yanlış eşleşmeden başka sonuç vermez. İl ile birlikte
 * söylenirlerse ("Rize Pazar") yine tanınırlar.
 */
const COMMON_WORD_DISTRICTS = new Set(
  ["merkez", "kale", "cay", "orta", "pazar", "guney", "bala", "hamur", "ulus", "evren", "kemer", "sur", "yenice", "bozkurt", "aksu", "kiraz", "uzum", "elma", "yaprakli", "ova",
    // Sektör kelimeleri ek atılınca ilçeye iniyor: "araç" (Kastamonu/Araç),
    // "kasa" → Kaş, "boru" → Bor, "maden", "bahçe". "Açık kasa tır" Antalya'ya gidiyordu.
    "arac", "kas", "bor", "maden", "bahce"].map(phraseKey),
);

export interface Lexicon {
  /** İfade anahtarı → olası anlamlar. */
  entries: Map<string, LexEntry[]>;
  /** En uzun ifadenin kelime sayısı (n-gram taraması için). */
  maxWords: number;
  commonWordDistricts: Set<string>;
  categoryName: Map<string, string>;
  subcategoryName: Map<string, string>;
}

function build(): Lexicon {
  const entries = new Map<string, LexEntry[]>();
  let maxWords = 1;

  const add = (phrase: string, entry: LexEntry) => {
    const key = phraseKey(phrase);
    if (!key) return;
    const list = entries.get(key) ?? [];
    const dup = list.some((e) => JSON.stringify(e) === JSON.stringify(entry));
    if (!dup) list.push(entry);
    entries.set(key, list);
    maxWords = Math.max(maxWords, key.split(" ").length);
  };

  // ── Konum ──
  const districtProvinces = new Map<string, { value: string; provinces: string[] }>();
  for (const p of PROVINCES) {
    add(p.name, { kind: "il", value: p.name });
    for (const d of p.districts) {
      const key = phraseKey(d);
      const cur = districtProvinces.get(key) ?? { value: d, provinces: [] };
      cur.provinces.push(p.name);
      districtProvinces.set(key, cur);
    }
  }
  for (const { value, provinces } of districtProvinces.values()) {
    add(value, { kind: "ilce", value, provinces });
  }
  // Konuşmada sık söylenen kısa biçimler.
  add("Afyon", { kind: "il", value: "Afyonkarahisar" });
  add("Maraş", { kind: "il", value: "Kahramanmaraş" });
  add("Antep", { kind: "il", value: "Gaziantep" });
  add("Urfa", { kind: "il", value: "Şanlıurfa" });

  // İstanbul'un yakaları ilçe filtresine sığmaz (onlarca ilçe), il yeter.
  add("Avrupa Yakası", { kind: "il", value: "İstanbul" });
  add("Anadolu Yakası", { kind: "il", value: "İstanbul" });

  // ── Kategori / alt kategori (taksonomi adlarından) ──
  const categoryName = new Map<string, string>();
  const subcategoryName = new Map<string, string>();
  // Alt kategori adının PARÇALARINDAN türetilen anahtarlar ("Sal (Platform) Tır" → "platform").
  const derived = new Set<string>();
  const addPart = (phrase: string, entry: LexEntry) => {
    derived.add(phraseKey(phrase));
    add(phrase, entry);
  };
  for (const c of CATEGORIES) {
    categoryName.set(c.slug, c.name);
    add(c.name, { kind: "kategori", slug: c.slug });
    for (const s of c.subcategories) {
      subcategoryName.set(`${c.slug}/${s.slug}`, s.name);
      const entry: LexEntry = { kind: "altKategori", category: c.slug, slug: s.slug };
      // "Beko Loder (Kazıcı Yükleyici)" → "Beko Loder (Kazıcı Yükleyici)", "Beko Loder", "Kazıcı Yükleyici"
      add(s.name, entry);
      const outer = s.name.replace(/\([^)]*\)/g, " ").trim();
      if (outer) addPart(outer, entry);
      for (const m of s.name.matchAll(/\(([^)]*)\)/g)) addPart(m[1], entry);
      for (const part of outer.split("/")) if (part.trim() !== outer) addPart(part, entry);
    }
  }
  for (const [target, phrases] of Object.entries(SYNONYMS)) {
    const [cat, sub] = target.split("/");
    if (!categoryName.has(cat)) throw new Error(`voice-search: bilinmeyen kategori ${cat}`);
    if (sub && !subcategoryName.has(target)) throw new Error(`voice-search: bilinmeyen alt kategori ${target}`);
    const entry: LexEntry = sub
      ? { kind: "altKategori", category: cat, slug: sub }
      : { kind: "kategori", slug: cat };
    for (const p of phrases) {
      // Elle yazılan eş anlamlı, ad parçasından otomatik türeyen anlamı ezer.
      // Yoksa "platform" (Vinçler ve Platformlar) "Açık Kasa / Sal (Platform)
      // Tır" adından türeyen anlama yeniliyordu: alt kategori her zaman kazanır.
      const key = phraseKey(p);
      if (derived.delete(key)) {
        entries.set(key, (entries.get(key) ?? []).filter((e) => e.kind !== "kategori" && e.kind !== "altKategori"));
      }
      add(p, entry);
    }
  }

  // ── Marka ──
  const brandSet = new Set(ALL_BRANDS);
  // İki harfli markalar ("PM", "EP") konuşmada başka şeylerle karışır.
  const brands = ALL_BRANDS.filter((b) => b.replace(/[^\p{L}\p{N}]/gu, "").length >= 3);
  for (const b of brands) add(b, { kind: "marka", value: b });
  // Çok kelimeli markalarda ilk kelime tek başına da yeter ("Ford Trucks" → "Ford"),
  // ama yalnız başka bir markayla çakışmıyorsa ("Volvo" / "Volvo Penta").
  const firstWord = new Map<string, string[]>();
  for (const b of brands) {
    const words = phraseKey(b).split(" ");
    if (words.length < 2 || words[0].length < 4) continue;
    firstWord.set(words[0], [...(firstWord.get(words[0]) ?? []), b]);
  }
  // Gündelik Türkçe/İngilizce kelime olan ilk kelimeler kendi başına marka sayılmaz
  // ("alım", "serin", "özen"); "Holland" konuşmada neredeyse hep New Holland'dır.
  const notAlone = new Set(["alim", "serin", "ozen", "global", "power", "custom", "easy", "holland"]);
  for (const [word, list] of firstWord) {
    if (list.length === 1 && !entries.has(word) && !notAlone.has(word)) {
      add(word, { kind: "marka", value: list[0] });
    }
  }
  for (const [brand, aliases] of Object.entries(BRAND_ALIASES)) {
    if (!brandSet.has(brand)) throw new Error(`voice-search: bilinmeyen marka ${brand}`);
    for (const a of aliases) add(a, { kind: "marka", value: brand });
  }

  return { entries, maxWords, commonWordDistricts: COMMON_WORD_DISTRICTS, categoryName, subcategoryName };
}

let cached: Lexicon | null = null;

/** Sözlük ilk kullanımda kurulur ve süreç boyunca saklanır. */
export function lexicon(): Lexicon {
  cached ??= build();
  return cached;
}
