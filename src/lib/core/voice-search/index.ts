/**
 * Sesli arama: konuşmadan çevrilmiş metni /ilanlar filtrelerine dönüştürür.
 *
 * Ses → metin İSTEMCİDE yapılır (web: Web Speech API, mobil: cihaz tanıyıcısı).
 * Buraya yalnız metin gelir; anlama işi sunucuda tek yerde durur ki web ve
 * mobil aynı sonucu versin ve eş anlamlı eklemek mağaza güncellemesi istemesin.
 *
 * Akış: kurallar (bedava, anında) → gerekirse LLM yedeği → URL parametreleri.
 * Çıktı mevcut arama sözleşmesine (parseFilters) karşı süzülür: bu katman yeni
 * bir arama motoru değil, mevcut filtrelerin sesli kısayoludur.
 */

import { getCategory, getSubCategoryName, transportApplies } from "../../categories";
import {
  CONDITION_LABELS,
  FUEL_LABELS,
  NAKLIYE_LABELS,
  OPERATOR_LABELS,
  PERIOD_LABELS,
  SORT_OPTIONS,
} from "../../constants";
import { parseFilters } from "../../filter-params";
import type { FilterState } from "../../types";
import { fail, ok, type Result } from "../errors";
import { voiceQuerySchema } from "../schemas";
import { llmEnabled, parseWithLlm } from "./llm";
import { looksLikeModel, parseWithRules } from "./rules";
import type { VoiceChip, VoiceFilters, VoiceParseResult } from "./types";

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

export async function parseVoiceQuery(
  input: unknown,
  options: VoiceParseOptions = {},
): Promise<Result<VoiceParseResult>> {
  const parsed = voiceQuerySchema.safeParse(input);
  if (!parsed.success) {
    return fail("validation", parsed.error.issues[0]?.message ?? "Geçersiz arama metni.");
  }
  const text = parsed.data.text.replace(/\s+/g, " ");

  const rules = parseWithRules(text);
  let filters = rules.filters;
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
      const llm = await parseWithLlm(text, rules.filters, options.llmDeps);
      if (llm) {
        filters = merge(rules.filters, llm);
        source = "llm";
      }
    }
  }

  const params = sanitize(toParams(filters));
  return ok({
    text,
    params,
    chips: toChips(params),
    remainder: rules.remainder.join(" "),
    source,
  });
}

/**
 * Kural sonucu önceliklidir (deterministik ve doğrulanmış); LLM yalnız boşları
 * doldurur. İstisna q: kurallar kalan kelimeleri olduğu gibi q yapar, LLM ise
 * bunları zaten filtrelere dağıtmıştır — model kodu değilse LLM'in q'su alınır.
 */
export function merge(rules: VoiceFilters, llm: VoiceFilters): VoiceFilters {
  const out: VoiceFilters = {
    ...llm,
    ...Object.fromEntries(Object.entries(rules).filter(([, v]) => v !== undefined)),
    marka: [...new Set([...rules.marka, ...llm.marka])],
    periyot: rules.periyot.length ? rules.periyot : llm.periyot,
    yakit: rules.yakit.length ? rules.yakit : llm.yakit,
    specs: { ...llm.specs, ...rules.specs },
  };

  // Alt kategori kategorisiyle birlikte gelir; kurallar yalnız kategori bulduysa
  // LLM'in alt kategorisi ancak aynı kategorideyse kabul edilir.
  if (!rules.altKategori) {
    const sameCategory = !rules.kategori || rules.kategori === llm.kategori;
    out.kategori = rules.kategori ?? llm.kategori;
    out.altKategori = sameCategory ? llm.altKategori : undefined;
  }
  // İlçe ili izler.
  if (!rules.ilce) out.ilce = out.il === llm.il ? llm.ilce : undefined;

  const rulesQIsModel = rules.q !== undefined && rules.q.split(" ").every(looksLikeModel);
  out.q = rulesQIsModel ? rules.q : llm.q;
  return out;
}

export function toParams(f: VoiceFilters): Record<string, string> {
  const p: Record<string, string> = {};
  const put = (k: string, v: string | number | undefined) => {
    if (v !== undefined && v !== "") p[k] = String(v);
  };
  put("q", f.q);
  put("kategori", f.kategori);
  put("altKategori", f.altKategori);
  put("il", f.il);
  put("ilce", f.ilce);
  if (f.marka.length) p.marka = f.marka.join(",");
  if (f.periyot.length) p.periyot = f.periyot.join(",");
  put("operator", f.operator);
  put("nakliye", f.nakliye);
  put("durum", f.durum);
  if (f.yakit.length) p.yakit = f.yakit.join(",");
  put("minFiyat", f.minFiyat);
  put("maxFiyat", f.maxFiyat);
  put("minYil", f.minYil);
  put("maxYil", f.maxYil);
  if (f.sirala && f.sirala !== "onerilen") p.sirala = f.sirala;
  for (const [k, v] of Object.entries(f.specs)) put(`spec_${k}`, v);
  return p;
}

/**
 * Üretilen parametreleri mevcut arama ayrıştırıcısından geçirir ve onun
 * tanımadığı her şeyi atar. Böylece bu modül hiçbir zaman sonuç sayfasının
 * sessizce yok sayacağı bir URL üretmez.
 */
function sanitize(params: Record<string, string>): Record<string, string> {
  const parsed = parseFilters(params);
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(params)) {
    const known = key.startsWith("spec_")
      ? parsed.specs?.[key.slice(5)] !== undefined
      : parsed[key as keyof FilterState] !== undefined;
    if (known) out[key] = value;
  }
  // Alt kategori kategorisiz anlamsızdır (filtre paneli de böyle davranır).
  if (out.altKategori && !out.kategori) delete out.altKategori;
  // Tırın kendisi nakliye aracıdır; tır ilanlarında transport hep "yok". "Nakliye
  // için tır" cümlesindeki nakliye filtresi kalsaydı sonuç sıfır olurdu.
  if (out.nakliye && !transportApplies(out.kategori)) delete out.nakliye;
  return out;
}

const tl = (n: string) => `${Number(n).toLocaleString("tr-TR")} ₺`;
const SORT_LABELS = Object.fromEntries(SORT_OPTIONS.map((s) => [s.value, s.label]));

export function toChips(params: Record<string, string>): VoiceChip[] {
  const chips: VoiceChip[] = [];
  const add = (param: string, value: string, label: string) => chips.push({ param, value, label });
  const many = (key: string, label: (v: string) => string) =>
    params[key]?.split(",").forEach((v) => add(key, v, label(v)));

  const category = getCategory(params.kategori);
  if (category) add("kategori", category.slug, category.name);
  if (category && params.altKategori) {
    add("altKategori", params.altKategori, getSubCategoryName(category.slug, params.altKategori));
  }
  if (params.il) add("il", params.il, params.il);
  if (params.ilce) add("ilce", params.ilce, params.ilce);
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
  for (const [key, value] of Object.entries(params)) {
    if (!key.startsWith("spec_")) continue;
    const field = category?.specFields.find((s) => s.key === key.slice(5));
    const unit = field?.unit ? ` ${field.unit}` : "";
    add(key, value, `${field?.label ?? key.slice(5)} ≥ ${Number(value).toLocaleString("tr-TR")}${unit}`);
  }
  if (params.sirala) add("sirala", params.sirala, SORT_LABELS[params.sirala] ?? params.sirala);
  return chips;
}
