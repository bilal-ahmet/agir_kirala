import "server-only";

/**
 * LLM yedeği — yalnız kural motoru cümleyi anlayamadığında çağrılır.
 *
 * Neden yalnız yedek: aramaların büyük çoğunluğu ("Ankara'da kepçe") sözlükle
 * bedava ve anında çözülür. LLM, "yarın şantiyede toprak kazacak büyükçe bir
 * makine lazım" gibi serbest cümleler içindir.
 *
 * Güvenlik/doğruluk: çıktı şeması taksonominin kendisinden üretilen enum'larla
 * kilitlidir; model sözlükte olmayan bir kategori, il veya marka UYDURAMAZ.
 * Dönen değer yine de bir kez daha doğrulanır.
 *
 * Her hata durumunda null döner — çağıran kural sonucuyla devam eder. Arama
 * hiçbir zaman LLM yüzünden başarısız olmaz.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { ALL_BRANDS } from "../../brands";
import { CATEGORIES } from "../../categories";
import { MAX_YEAR, PERIODS, SORT_OPTIONS } from "../../constants";
import { PROVINCES, districtsOf } from "../../locations";
import type { RentalPeriod, SortKey } from "../../types";
import { emptyFilters, type VoiceFilters } from "./types";

const MODEL = "claude-haiku-5-5";
/** Sesli aramada kullanıcı bekliyor: yavaş yanıt kural sonucundan kötüdür. */
const TIMEOUT_MS = 4000;

const SUB_KEYS = CATEGORIES.flatMap((c) => c.subcategories.map((s) => `${c.slug}/${s.slug}`));
const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
const PROVINCE_NAMES = PROVINCES.map((p) => p.name);
const PERIOD_VALUES = PERIODS.map((p) => p.value);
const SORT_VALUES = SORT_OPTIONS.map((s) => s.value);

const brandSet = new Set(ALL_BRANDS);
const subSet = new Set(SUB_KEYS);

/**
 * Boş değer için "" / 0 / [] kullanılır, null değil: nullable alanlar şemada
 * birleşim tipi (anyOf) üretir ve yapılandırılmış çıktıda birleşim sayısı
 * sınırlıdır. Sentinel değerler şemayı düz tutar.
 */
const outputSchema = z.object({
  altKategori: z
    .enum(["", ...SUB_KEYS] as [string, ...string[]])
    .describe("\"kategori/alt-kategori\" biçiminde makine türü; emin değilsen boş."),
  kategori: z.enum(["", ...CATEGORY_SLUGS] as [string, ...string[]]).describe("Ana kategori; yoksa boş."),
  il: z.enum(["", ...PROVINCE_NAMES] as [string, ...string[]]).describe("İl; yoksa boş."),
  ilce: z.string().describe("İlçe adı, yalnız açıkça söylendiyse; yoksa boş."),
  marka: z.array(z.enum(ALL_BRANDS as [string, ...string[]])).describe("Söylenen markalar."),
  q: z
    .string()
    .describe("Model kodu (ör. 3CX, PC210) ya da filtrelere sığmayan kısa anahtar kelime; yoksa boş."),
  periyot: z.array(z.enum(PERIOD_VALUES as [string, ...string[]])),
  operator: z.enum(["", "operatorlu", "operatorsuz"]),
  nakliye: z.enum(["", "var", "yok"]),
  durum: z.enum(["", "sifir", "ikinci_el"]),
  minFiyat: z.number().describe("TL, yoksa 0."),
  maxFiyat: z.number().describe("TL, yoksa 0."),
  minYil: z.number().describe("En eski model yılı, yoksa 0."),
  sirala: z.enum(["", ...SORT_VALUES] as [string, ...string[]]),
});

type LlmOutput = z.infer<typeof outputSchema>;

const SUB_LIST = CATEGORIES.map(
  (c) =>
    `${c.slug} (${c.name}): ` + c.subcategories.map((s) => `${c.slug}/${s.slug} = ${s.name}`).join("; "),
).join("\n");

const SYSTEM = `Bir ağır vasıta ve iş makinesi kiralama sitesinin sesli arama ayrıştırıcısısın.
Girdi, kullanıcının konuşmasından otomatik metne çevrilmiş Türkçe bir arama cümlesidir.
Görevin cümleyi sitenin arama filtrelerine çevirmek.

Kurallar:
- Konuşma tanıma hataları olabilir ("eskavatör", "katerpilar", "jisibi"); en olası anlamı seç.
- Yalnız cümlede söylenen ya da açıkça ima edilen filtreleri doldur. Emin değilsen boş bırak.
- Makinenin yaptığı işi tarif eden cümlelerde ("toprak kazacak makine", "yük kaldıracak") uygun türü seç.
- "Zaten bulunanlar" verilen değerler doğrudur; onları aynen koru ve yalnız eksikleri tamamla.
- Alt kategori seçersen kategori alanına da onun kategorisini yaz.
- q yalnız model kodu ya da filtrelere sığmayan kısa bir anahtar kelime içindir; cümlenin tamamını yazma.
- Boş değerler: metin için "", sayı için 0, liste için [].

Kategoriler ve alt kategoriler:
${SUB_LIST}

Örnekler:
"yarın şantiyede toprak kazacak büyükçe bir makine lazım İzmir" → kategori=hafriyat, altKategori=hafriyat/paletli-ekskavator, il=İzmir
"depoda palet taşımak için bir şey arıyorum" → kategori=forklift
"yüksekte cephe boyası yapacağız sepetli bir şey" → kategori=vinc-platform, altKategori=vinc-platform/sepetli-vinc
"elektrik kesintisi için güç kaynağı kiralamak istiyorum" → kategori=jenerator
"hafriyatı taşıyacak araç ayda ne kadar" → kategori=damperli-kamyon, periyot=[aylik]
"katerpilar üç yüz yirmi" → marka=[Caterpillar], q=320`;

let client: Anthropic | null = null;

function getClient(): Anthropic {
  // Yeniden deneme yok: zaman aşımında kullanıcıyı iki kez bekletmek yerine
  // kural sonucuyla devam edilir.
  client ??= new Anthropic({ maxRetries: 0 });
  return client;
}

/** LLM yedeği yapılandırılmış mı. Anahtar yoksa (yerel/CI) adım tamamen atlanır. */
export function llmEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function parseWithLlm(
  text: string,
  known: VoiceFilters,
  deps: { client?: Pick<Anthropic, "messages"> } = {},
): Promise<VoiceFilters | null> {
  try {
    const api = deps.client ?? getClient();
    const response = await api.messages.parse(
      {
        model: MODEL,
        max_tokens: 1024,
        // Kısa bir sınıflandırma işi: düşünme gecikmeden başka bir şey katmaz.
        thinking: { type: "disabled" },
        output_config: { effort: "low", format: zodOutputFormat(outputSchema) },
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [
          {
            role: "user",
            content: `Cümle: ${JSON.stringify(text)}\nZaten bulunanlar: ${JSON.stringify(describeKnown(known))}`,
          },
        ],
      },
      { timeout: TIMEOUT_MS },
    );

    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    if (!response.parsed_output) return null;
    return sanitize(response.parsed_output);
  } catch (e) {
    console.warn("[voice-search] LLM yedeği kullanılamadı:", e instanceof Error ? e.message : e);
    return null;
  }
}

function describeKnown(f: VoiceFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(f)) {
    if (k === "q") continue;
    if (Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : v !== undefined) {
      out[k] = v;
    }
  }
  if (f.kategori && f.altKategori) out.altKategori = `${f.kategori}/${f.altKategori}`;
  return out;
}

/** Şema zaten kısıtlıyor; yine de taksonomiye karşı ikinci kez doğrulanır. */
function sanitize(o: LlmOutput): VoiceFilters {
  const f = emptyFilters();

  if (o.altKategori && subSet.has(o.altKategori)) {
    const [cat, sub] = o.altKategori.split("/");
    f.kategori = cat;
    f.altKategori = sub;
  } else if (o.kategori && CATEGORY_SLUGS.includes(o.kategori)) {
    f.kategori = o.kategori;
  }

  if (o.il && PROVINCE_NAMES.includes(o.il)) f.il = o.il;
  if (o.ilce) {
    if (f.il && districtsOf(f.il).includes(o.ilce)) {
      f.ilce = o.ilce;
    } else if (!f.il) {
      const owners = PROVINCES.filter((p) => p.districts.includes(o.ilce));
      if (owners.length === 1) {
        f.il = owners[0].name;
        f.ilce = o.ilce;
      }
    }
  }

  f.marka = [...new Set(o.marka.filter((b) => brandSet.has(b)))];
  f.periyot = [...new Set(o.periyot.filter((p): p is RentalPeriod => PERIOD_VALUES.includes(p as RentalPeriod)))];
  if (o.operator) f.operator = o.operator;
  if (o.nakliye) f.nakliye = o.nakliye;
  if (o.durum) f.durum = o.durum;
  if (o.sirala && SORT_VALUES.includes(o.sirala as SortKey)) f.sirala = o.sirala as SortKey;

  const money = (n: number) => (Number.isFinite(n) && n > 0 ? Math.round(n) : undefined);
  f.minFiyat = money(o.minFiyat);
  f.maxFiyat = money(o.maxFiyat);
  if (Number.isInteger(o.minYil) && o.minYil >= 1980 && o.minYil <= MAX_YEAR + 1) f.minYil = o.minYil;

  const q = o.q.trim().slice(0, 60);
  if (q) f.q = q;
  return f;
}
