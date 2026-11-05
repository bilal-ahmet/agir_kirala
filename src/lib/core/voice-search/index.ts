/**
 * Sesli arama: konuşmadan çevrilmiş metni /ilanlar filtrelerine dönüştürür.
 *
 * Ses → metin İSTEMCİDE yapılır (web: Web Speech API, mobil: cihaz tanıyıcısı).
 * Buraya yalnız metin gelir; anlama işi sunucuda tek yerde durur ki web ve
 * mobil aynı sonucu versin ve eş anlamlı eklemek mağaza güncellemesi istemesin.
 *
 * Akış: kurallar (bedava, anında) → gerekirse LLM yedeği → URL parametreleri.
 * Çıktı mevcut arama sözleşmesine (parseFilters) karşı süzülür ve filtre
 * panelinin budama kurallarından (filter-selection.ts) geçer: bu katman yeni
 * bir arama motoru değil, mevcut filtrelerin sesli kısayoludur.
 *
 * İki mod:
 * - new: yeni arama ("Ankara ve İzmir'de kepçe").
 * - refine: istemci mevcut filtreleri `current` olarak gönderdiyse ve cümle
 *   bir düzenleme ise ("Kocaeli'yi de ekle", "JCB'yi çıkar", "en ucuza göre
 *   sırala") o filtreler değiştirilir. Dönen params her iki modda da TAM kümedir.
 */

import { CATEGORIES, getCategory, getSubCategoryName } from "../../categories";
import {
  CONDITION_LABELS,
  FUEL_LABELS,
  NAKLIYE_LABELS,
  OPERATOR_LABELS,
  PERIOD_LABELS,
  SORT_OPTIONS,
} from "../../constants";
import { parseFilters } from "../../filter-params";
import { pruneDependents } from "../../filter-selection";
import { parseDistrict } from "../../locations";
import type { FilterState, FuelType, RentalPeriod } from "../../types";
import { fail, ok, type Result } from "../errors";
import { voiceQuerySchema } from "../schemas";
import { llmEnabled, parseWithLlm } from "./llm";
import { looksLikeModel, parseWithRules, type RulesIntent, type RulesResult } from "./rules";
import { emptyFilters, LIST_KEYS, type VoiceChip, type VoiceFilters, type VoiceParseResult } from "./types";

export type { VoiceChip, VoiceParseResult } from "./types";

export { voiceQuerySchema };

export interface VoiceParseOptions {
  /**
   * LLM yedeğine girmeden hemen önce çağrılır (hız sınırı burada uygulanır).
   * Fırlatırsa LLM atlanır ve kural sonucu döner — arama yine çalışır.
   * Kural yolu bu kancayı hiç çağırmaz: bedava yol DB round-trip'i ödemez.
   */
  beforeLlm?: () => Promise<void>;
  /** false → LLM hiç denenmez (testler, ileride bir özellik bayrağı). */
  llm?: boolean;
  /** Test için LLM bağımlılığı. */
  llmDeps?: Parameters<typeof parseWithLlm>[2];
}

// Bilinçli ilke: söylenen hiçbir filtre "sonuç çıkmıyor" diye sessizce
// atılmaz. Kullanıcı ne dediyse o aranır; uygun ilan yoksa sonuç sayfası
// bunu söyler ve filtreler çip olarak görünür, kullanıcı kendisi kaldırır.
// (Eskiden sonuç sıfırsa serbest kelime q atılıyor, kategorinin listesinde
// olmayan marka budanıyordu.)

/** Sesli aramanın kendisinin ürettiği parametreler; gerisi düzenlemede olduğu gibi korunur. */
const VOICE_KEYS = new Set([
  "q", "kategori", "altKategori", "il", "ilce", "marka", "periyot", "operator", "nakliye",
  "durum", "yakit", "minFiyat", "maxFiyat", "minYil", "maxYil", "sirala",
]);
const isVoiceKey = (k: string) => VOICE_KEYS.has(k) || k.startsWith("spec_");

export async function parseVoiceQuery(
  input: unknown,
  options: VoiceParseOptions = {},
): Promise<Result<VoiceParseResult>> {
  const parsed = voiceQuerySchema.safeParse(input);
  if (!parsed.success) {
    return fail("validation", parsed.error.issues[0]?.message ?? "Geçersiz arama metni.");
  }
  const text = parsed.data.text.replace(/\s+/g, " ");

  // Mevcut filtreler de aynı süzgeçten geçer: istemci ne gönderirse göndersin
  // taban, filtre panelinin göstereceği geçerli bir seçimdir.
  const current = sanitize(parsed.data.current ?? {});
  delete current.sayfa;
  const hasCurrent = Object.keys(current).length > 0;
  const currentFilters = fromParams(current);

  const rules = parseWithRules(
    text,
    hasCurrent
      ? { kategori: currentFilters.kategori, altKategori: currentFilters.altKategori, il: currentFilters.il }
      : undefined,
  );
  let mode = decideMode(rules, hasCurrent);
  // "Filtreleri temizle" de bir düzenlemedir ama tabanı boştur.
  const keepCurrent = () => mode === "refine" && !rules.intent.reset;
  let base = keepCurrent() ? currentFilters : emptyFilters();
  let ops = rules.filters;
  let source: VoiceParseResult["source"] = "rules";

  const useLlm = options.llm !== false && (options.llmDeps?.client || llmEnabled());
  if (useLlm && rules.confidence === "low") {
    let allowed = true;
    try {
      await options.beforeLlm?.();
    } catch {
      allowed = false;
    }
    if (allowed) {
      const llm = await parseWithLlm(text, rules.filters, options.llmDeps, hasCurrent ? currentFilters : undefined);
      if (llm) {
        source = "llm";
        // Açık bir komut ("ekle", "çıkar", "baştan") varsa kural kararı geçerli.
        if (hasCurrent && !explicitIntent(rules.intent)) mode = llm.mode;
        // LLM tam kümeyi verir (düzenlemede mevcut filtreler dahil); kural
        // sonucu üstüne uygulanır ki kesin eşleşmeler kaybolmasın.
        base = llm.filters;
        // LLM teknik özellik yazmaz; düzenlemede mevcutlar korunur.
        if (keepCurrent()) base.specs = { ...currentFilters.specs };
        // Sözlük 81 ilin tamamını tanır: kurallar il bulduysa LLM'in fazladan
        // eklediği il büyük olasılıkla hatadır. (Makine türünde öyle değil:
        // "toprak kazacak bir şey ya da forklift" → LLM hafriyatı haklı ekler.)
        if (mode === "new" && rules.filters.il.length) {
          base.il = base.il.filter((p) => rules.filters.il.includes(p));
          base.ilce = base.ilce.filter((d) => base.il.includes(parseDistrict(d).il ?? ""));
        }
        ops = { ...rules.filters, q: rulesQIsModel(rules) ? rules.filters.q : undefined };
      }
    }
  }

  const merged = applyOps(base, ops, rules.intent);
  const params = sanitize({
    // Sesin modellemediği filtreler (fotoğraflı, satıcı tipi…) düzenlemede korunur.
    ...(keepCurrent() ? Object.fromEntries(Object.entries(current).filter(([k]) => !isVoiceKey(k))) : {}),
    ...toParams(merged),
  });

  const chips = toChips(params);
  return ok({
    text,
    params,
    chips,
    remainder: rules.remainder.join(" "),
    source,
    mode,
    ...(mode === "refine" ? { changes: diffChips(toChips(current), chips) } : {}),
  });
}

/** "ekle", "sadece", "çıkar/yerine", "baştan": kullanıcı ne istediğini açıkça söyledi. */
function explicitIntent(i: RulesIntent): boolean {
  return i.add || i.reset || i.removeVerb || i.only.length > 0;
}

function rulesQIsModel(rules: RulesResult): boolean {
  const q = rules.filters.q;
  return q !== undefined && q.split(" ").every(looksLikeModel);
}

/**
 * Yeni arama mı, mevcut filtrelerin düzenlemesi mi.
 *
 * Açık komut ("ekle", "sadece", "çıkar", "yerine") → düzenleme; "baştan"/
 * "yeni arama" → yeni. Komut yoksa: cümle bir makine, yer ya da marka
 * söylüyorsa yeni aramadır ("Ankara'da forklift"); yalnız niteleyici
 * söylüyorsa ("operatörlü olsun", "en ucuza göre sırala", "JCB olmasın")
 * düzenlemedir. Yalın "de/da" bilerek işaret sayılmaz (bkz. rules.ts).
 */
export function decideMode(rules: RulesResult, hasCurrent: boolean): VoiceParseResult["mode"] {
  if (!hasCurrent) return "new";
  const { intent, filters: f } = rules;
  // "Filtreleri temizle": hepsini kaldıran bir düzenleme (sonuç boş küme).
  if (intent.reset) return hasAnyFilter(f) ? "new" : "refine";
  if (intent.add || intent.removeVerb || intent.only.length) return "refine";
  const primary = f.kategori.length || f.altKategori.length || f.il.length || f.ilce.length || f.marka.length;
  if (primary) return "new";
  const modifiers =
    LIST_KEYS.some((k) => f.removed[k].length) ||
    f.periyot.length ||
    f.yakit.length ||
    Object.keys(f.specs).length ||
    [f.operator, f.nakliye, f.durum, f.minFiyat, f.maxFiyat, f.minYil, f.maxYil, f.sirala].some((v) => v !== undefined);
  return modifiers ? "refine" : "new";
}

function hasAnyFilter(f: VoiceFilters): boolean {
  return Object.keys(toParams(f)).length > 0;
}

const SUB_OWNER = new Map(CATEGORIES.flatMap((c) => c.subcategories.map((s) => [s.slug, c.slug] as const)));

/**
 * Tabana cümlenin işlemlerini uygular.
 *
 * - Listeler: taban ∪ söylenenler − çıkarılanlar; "sadece" denen boyut değiştirilir.
 * - Bir kategorinin seçili alt türlerinin hepsi çıkarıldıysa kategori de çıkar:
 *   "kepçe ve forklift" → "kepçeyi çıkar" → yalnız forklift (tüm hafriyat değil).
 * - Tekil alanlar (operatör, fiyat, sıralama, q…): söylenen kazanır.
 * - periyot/yakıt/seçenekli özellik: "de ekle" ise birleşim, değilse değiştirme.
 *
 * Yeni aramada taban boştur (ya da LLM'in kümesi); işlem idempotent olduğu
 * için LLM'in zaten uyguladığı bir değişikliği ikinci kez uygulamak zararsız.
 */
export function applyOps(base: VoiceFilters, ops: VoiceFilters, intent: Pick<RulesIntent, "add" | "only">): VoiceFilters {
  const out = emptyFilters();
  const union = <T>(a: T[], b: T[]) => [...new Set([...a, ...b])];

  for (const key of LIST_KEYS) {
    const removed = ops.removed[key];
    const kept = intent.only.includes(key) && ops[key].length ? ops[key] : union(base[key], ops[key]);
    out[key] = kept.filter((v) => {
      if (removed.includes(v)) return false;
      // İlçe yalın adla çıkarılabilir ("Çankaya'yı çıkar" → "Ankara/Çankaya").
      return key !== "ilce" || !removed.includes(parseDistrict(v).ilce);
    });
  }

  for (const sub of ops.removed.altKategori) {
    const cat = SUB_OWNER.get(sub);
    if (!cat || !base.altKategori.includes(sub) || ops.kategori.includes(cat)) continue;
    const left = out.altKategori.some((s) => SUB_OWNER.get(s) === cat);
    if (!left) out.kategori = out.kategori.filter((c) => c !== cat);
  }

  const list = <T>(b: T[], o: T[]) => (o.length ? (intent.add ? union(b, o) : o) : b);
  out.periyot = list<RentalPeriod>(base.periyot, ops.periyot);
  out.yakit = list<FuelType>(base.yakit, ops.yakit);

  out.specs = { ...base.specs };
  for (const [k, v] of Object.entries(ops.specs)) {
    const cur = out.specs[k];
    out.specs[k] = Array.isArray(v) && Array.isArray(cur) && intent.add ? union(cur, v) : v;
  }

  out.q = ops.q ?? base.q;
  out.operator = ops.operator ?? base.operator;
  out.nakliye = ops.nakliye ?? base.nakliye;
  out.durum = ops.durum ?? base.durum;
  out.minFiyat = ops.minFiyat ?? base.minFiyat;
  out.maxFiyat = ops.maxFiyat ?? base.maxFiyat;
  out.minYil = ops.minYil ?? base.minYil;
  out.maxYil = ops.maxYil ?? base.maxYil;
  out.sirala = ops.sirala ?? base.sirala;
  return out;
}

export function toParams(f: VoiceFilters): Record<string, string> {
  const p: Record<string, string> = {};
  const put = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== "") p[k] = String(v);
  };
  const putList = (k: string, v: string[]) => {
    if (v.length) p[k] = v.join(",");
  };
  put("q", f.q);
  putList("kategori", f.kategori);
  putList("altKategori", f.altKategori);
  putList("il", f.il);
  putList("ilce", f.ilce);
  putList("marka", f.marka);
  putList("periyot", f.periyot);
  put("operator", f.operator);
  put("nakliye", f.nakliye);
  put("durum", f.durum);
  putList("yakit", f.yakit);
  put("minFiyat", f.minFiyat);
  put("maxFiyat", f.maxFiyat);
  put("minYil", f.minYil);
  put("maxYil", f.maxYil);
  if (f.sirala && f.sirala !== "onerilen") p.sirala = f.sirala;
  for (const [k, v] of Object.entries(f.specs)) {
    if (Array.isArray(v)) putList(`spec_${k}`, v);
    else put(`spec_${k}`, v);
  }
  return p;
}

/** Süzülmüş URL parametrelerinden VoiceFilters (düzenlemenin tabanı). */
function fromParams(params: Record<string, string>): VoiceFilters {
  const s: FilterState = parseFilters(params);
  const f = emptyFilters();
  f.q = s.q;
  f.kategori = s.kategori ?? [];
  f.altKategori = s.altKategori ?? [];
  f.il = s.il ?? [];
  f.ilce = s.ilce ?? [];
  f.marka = s.marka ?? [];
  f.periyot = s.periyot ?? [];
  f.yakit = s.yakit ?? [];
  // Panelde ikisi birden işaretliyse ("operatörlü" + "operatörsüz") filtre yok demektir.
  const one = <T>(v: T[] | undefined) => (v?.length === 1 ? v[0] : undefined);
  f.operator = one(s.operator);
  f.nakliye = one(s.nakliye);
  f.durum = one(s.durum);
  f.minFiyat = s.minFiyat;
  f.maxFiyat = s.maxFiyat;
  f.minYil = s.minYil;
  f.maxYil = s.maxYil;
  f.sirala = s.sirala && s.sirala !== "onerilen" ? s.sirala : undefined;
  f.specs = { ...(s.specs ?? {}) };
  return f;
}

/**
 * Parametreleri mevcut arama ayrıştırıcısından geçirir ve onun tanımadığı her
 * şeyi atar; ardından filtre panelinin yapısal budamasını uygular (alt
 * kategori yalnız seçili kategoriden, ilçe "İl/İlçe" ve yalnız seçili ilden,
 * teknik özellik yalnız tek kategoride, nakliye yalnız uygun kategoride).
 * Böylece bu modül sonuç sayfasının sessizce yok sayacağı bir URL üretmez.
 *
 * Marka budanmaz: "Scania forklift" denirse ikisi de aranır; öyle bir ilan
 * yoksa sonuç sayfası "uygun ilan yok" der. Söyleneni atmak, kullanıcıya
 * istemediği sonuçları göstermek olurdu.
 */
function sanitize(params: Record<string, string>): Record<string, string> {
  const parsed = parseFilters(params);
  const known = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    const ok = key.startsWith("spec_")
      ? parsed.specs?.[key.slice(5)] !== undefined
      : parsed[key as keyof FilterState] !== undefined;
    if (ok && value !== "") known.set(key, value);
  }
  if (known.get("sirala") === "onerilen") known.delete("sirala");
  // Değişen parametre verilmez: yapısal budama, marka dokunulmaz.
  pruneDependents(known);
  return Object.fromEntries(known);
}

const tl = (n: string) => `${Number(n).toLocaleString("tr-TR")} ₺`;
const SORT_LABELS = Object.fromEntries(SORT_OPTIONS.map((s) => [s.value, s.label]));

export function toChips(params: Record<string, string>): VoiceChip[] {
  const chips: VoiceChip[] = [];
  const add = (param: string, value: string, label: string) => chips.push({ param, value, label });
  const values = (key: string) => params[key]?.split(",").filter(Boolean) ?? [];
  const many = (key: string, label: (v: string) => string) => values(key).forEach((v) => add(key, v, label(v)));

  const cats = values("kategori");
  many("kategori", (v) => getCategory(v)?.name ?? v);
  many("altKategori", (v) => {
    const owner = SUB_OWNER.get(v);
    return owner ? getSubCategoryName(owner, v) : v;
  });
  many("il", (v) => v);
  const severalProvinces = values("il").length > 1;
  many("ilce", (v) => {
    const { il, ilce } = parseDistrict(v);
    return severalProvinces && il ? `${ilce} (${il})` : ilce;
  });
  many("marka", (v) => v);
  if (params.q) add("q", params.q, `"${params.q}"`);
  many("periyot", (v) => PERIOD_LABELS[v as keyof typeof PERIOD_LABELS] ?? v);
  if (params.operator) add("operator", params.operator, OPERATOR_LABELS[params.operator as keyof typeof OPERATOR_LABELS]);
  if (params.nakliye) add("nakliye", params.nakliye, NAKLIYE_LABELS[params.nakliye as keyof typeof NAKLIYE_LABELS]);
  if (params.durum) add("durum", params.durum, CONDITION_LABELS[params.durum as keyof typeof CONDITION_LABELS]);
  many("yakit", (v) => FUEL_LABELS[v as keyof typeof FUEL_LABELS] ?? v);
  if (params.minFiyat) add("minFiyat", params.minFiyat, `En az ${tl(params.minFiyat)}`);
  if (params.maxFiyat) add("maxFiyat", params.maxFiyat, `En fazla ${tl(params.maxFiyat)}`);
  if (params.minYil) add("minYil", params.minYil, `${params.minYil} ve sonrası`);
  if (params.maxYil) add("maxYil", params.maxYil, `${params.maxYil} ve öncesi`);
  // Teknik alanlar yalnız tek kategoride bulunur (bkz. sanitize).
  const fields = cats.length === 1 ? (getCategory(cats[0])?.specFields ?? []) : [];
  for (const [key, value] of Object.entries(params)) {
    if (!key.startsWith("spec_")) continue;
    const field = fields.find((s) => s.key === key.slice(5));
    const name = field?.label ?? key.slice(5);
    const n = Number(value);
    if (Number.isFinite(n)) {
      const unit = field?.unit ? ` ${field.unit}` : "";
      add(key, value, `${name} ≥ ${n.toLocaleString("tr-TR")}${unit}`);
    } else {
      values(key).forEach((v) => add(key, v, v === "true" ? name : `${name}: ${v}`));
    }
  }
  if (params.sirala) add("sirala", params.sirala, SORT_LABELS[params.sirala] ?? params.sirala);
  return chips;
}

/** Düzenlemede kullanıcıya "şunu ekledim / şunu çıkardım" diye gösterilen fark. */
function diffChips(before: VoiceChip[], after: VoiceChip[]): { added: VoiceChip[]; removed: VoiceChip[] } {
  const id = (c: VoiceChip) => `${c.param}\u0000${c.value}`;
  const had = new Set(before.map(id));
  const has = new Set(after.map(id));
  return {
    added: after.filter((c) => !had.has(id(c))),
    removed: before.filter((c) => !has.has(id(c))),
  };
}
