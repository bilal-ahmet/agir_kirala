import "server-only";

/**
 * LLM yedeği — yalnız kural motoru cümleyi anlayamadığında çağrılır.
 *
 * Neden yalnız yedek: aramaların büyük çoğunluğu ("Ankara'da kepçe") sözlükle
 * bedava ve anında çözülür. LLM, "yarın şantiyede toprak kazacak büyükçe bir
 * makine lazım" gibi serbest cümleler içindir. Haiku seçildi: kullanıcı
 * bekliyor; düşünme kapalı ve düşük efor ile yanıt ~1 sn. Daha büyük
 * modellerde düşünme kapatılamıyor, gecikme kural sonucundan kötü olurdu.
 *
 * Güvenlik/doğruluk: çıktı şeması taksonominin kendisinden üretilen enum'larla
 * kilitlidir; model sözlükte olmayan bir kategori, il veya marka UYDURAMAZ.
 * Dönen değer yine de bir kez daha doğrulanır.
 *
 * Düzenleme: istemci mevcut filtreleri gönderdiyse modele verilir; model
 * cümle bir düzenleme ise ("Kocaeli'yi de ekle") TAM yeni filtre kümesini yazar.
 *
 * Her hata durumunda null döner — çağıran kural sonucuyla devam eder. Arama
 * hiçbir zaman LLM yüzünden başarısız olmaz.
 */

import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { ALL_BRANDS } from "../../brands";
import { CATEGORIES } from "../../categories";
import { FUEL_LABELS, MAX_YEAR, PERIODS, SORT_OPTIONS } from "../../constants";
import { PROVINCES, districtsOf, parseDistrict, scopedDistrict } from "../../locations";
import type { FuelType, RentalPeriod, SortKey } from "../../types";
import { emptyFilters, type VoiceFilters } from "./types";

const MODEL = "claude-haiku-5-5";
/** Sesli aramada kullanıcı bekliyor: yavaş yanıt kural sonucundan kötüdür. */
const TIMEOUT_MS = 4000;

const SUB_KEYS = CATEGORIES.flatMap((c) => c.subcategories.map((s) => `${c.slug}/${s.slug}`));
const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug);
const PROVINCE_NAMES = PROVINCES.map((p) => p.name);
const PERIOD_VALUES = PERIODS.map((p) => p.value);
const FUEL_VALUES = Object.keys(FUEL_LABELS) as FuelType[];
const SORT_VALUES = SORT_OPTIONS.map((s) => s.value);

const brandSet = new Set(ALL_BRANDS);
const subSet = new Set(SUB_KEYS);

type Tuple = [string, ...string[]];

/**
 * Boş değer için "" / 0 / [] kullanılır, null değil: nullable alanlar şemada
 * birleşim tipi (anyOf) üretir ve yapılandırılmış çıktıda birleşim sayısı
 * sınırlıdır. Sentinel değerler şemayı düz tutar.
 */
const outputSchema = z.object({
  mod: z
    .enum(["yeni", "duzenle"])
    .describe("Mevcut filtreler verildiyse ve cümle onları değiştiriyorsa \"duzenle\", aksi halde \"yeni\"."),
  kategori: z.array(z.enum(CATEGORY_SLUGS as Tuple)).describe("Ana kategoriler; yoksa []."),
  altKategori: z
    .array(z.enum(SUB_KEYS as Tuple))
    .describe("\"kategori/alt-kategori\" biçiminde makine türleri; emin değilsen []."),
  il: z.array(z.enum(PROVINCE_NAMES as Tuple)).describe("İller; yoksa []."),
  ilce: z.array(z.string()).describe("\"İl/İlçe\" biçiminde ilçeler (ör. \"Ankara/Çankaya\"), yalnız açıkça söylendiyse; yoksa []."),
  marka: z.array(z.enum(ALL_BRANDS as Tuple)).describe("Markalar."),
  q: z
    .string()
    .describe("Model kodu (ör. 3CX, PC210) ya da filtrelere sığmayan kısa anahtar kelime; yoksa boş."),
  periyot: z.array(z.enum(PERIOD_VALUES as Tuple)),
  operator: z.enum(["", "operatorlu", "operatorsuz"]),
  nakliye: z.enum(["", "var", "yok"]),
  durum: z.enum(["", "sifir", "ikinci_el"]),
  yakit: z.array(z.enum(FUEL_VALUES as Tuple)),
  minFiyat: z.number().describe("TL, yoksa 0."),
  maxFiyat: z.number().describe("TL, yoksa 0."),
  minYil: z.number().describe("En eski model yılı, yoksa 0."),
  maxYil: z.number().describe("En yeni model yılı, yoksa 0."),
  sirala: z.enum(["", ...SORT_VALUES] as Tuple),
});

type LlmOutput = z.infer<typeof outputSchema>;

export interface LlmResult {
  filters: VoiceFilters;
  mode: "new" | "refine";
}

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
- Her filtre birden çok değer alabilir: birden çok il, ilçe, makine türü ya da marka söylenirse hepsini yaz ("Ankara ve İzmir", "kepçe ya da forklift").
- Alt kategori yazarsan onun kategorisini kategori listesine de yaz. Bir kategorinin yalnız bazı alt türleri istendiyse yalnız onları yaz; kategorinin tamamı istendiyse alt tür yazma.
- İlçeyi "İl/İlçe" biçiminde yaz ve ilini il listesine de ekle.
- "Zaten bulunanlar" verilen değerler doğrudur; onları aynen koru ve yalnız eksikleri tamamla.
- "olmasın", "hariç", "çıkar" denen değerleri yazma; aramada hariç tutma yok.
- q yalnız model kodu ya da filtrelere sığmayan kısa bir anahtar kelime içindir; cümlenin tamamını yazma.
- Boş değerler: metin için "", sayı için 0, liste için [].

Mevcut filtreler verilirse kullanıcı sonuç sayfasındadır:
- Cümle bu filtreleri değiştiriyorsa ("… de ekle", "… çıkar", "… yerine …", "sadece …", "operatörlü olsun", "daha ucuz olsun") mod="duzenle" yaz ve değişiklik uygulanmış TAM filtre kümesini yaz: değişmeyen mevcut filtreleri de aynen tekrarla.
- Cümle bambaşka bir arama ise ("Ankara'da forklift") mod="yeni" yaz ve yalnız yeni aramanın filtrelerini yaz.

Kategoriler ve alt kategoriler:
${SUB_LIST}

Örnekler:
"yarın şantiyede toprak kazacak büyükçe bir makine lazım İzmir" → kategori=[hafriyat], altKategori=[hafriyat/paletli-ekskavator], il=[İzmir]
"depoda palet taşımak için bir şey arıyorum İzmir ya da Manisa" → kategori=[forklift], il=[İzmir, Manisa]
"yüksekte cephe boyası yapacağız sepetli bir şey" → kategori=[vinc-platform], altKategori=[vinc-platform/sepetli-vinc]
"elektrik kesintisi için güç kaynağı kiralamak istiyorum" → kategori=[jenerator]
"hafriyatı taşıyacak araç ayda ne kadar" → kategori=[damperli-kamyon], periyot=[aylik]
"Ankara Çankaya ve İzmir'de kazı yapacak bir şey ya da kamyon" → kategori=[hafriyat, damperli-kamyon], il=[Ankara, İzmir], ilce=[Ankara/Çankaya]
"katerpilar üç yüz yirmi" → marka=[Caterpillar], q=320
Mevcut: il=[İstanbul], kategori=[hafriyat]; "Kocaeli tarafına da bakalım" → mod=duzenle, il=[İstanbul, Kocaeli], kategori=[hafriyat]
Mevcut: kategori=[forklift], marka=[Linde, Toyota]; "Toyota olmasın, bir de akülü olanlar" → mod=duzenle, kategori=[forklift], marka=[Linde], yakit=[elektrik]`;

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
  current?: VoiceFilters,
): Promise<LlmResult | null> {
  try {
    const api = deps.client ?? getClient();
    const lines = [`Cümle: ${JSON.stringify(text)}`, `Zaten bulunanlar: ${JSON.stringify(describe(known))}`];
    if (current) lines.push(`Mevcut filtreler: ${JSON.stringify(describe(current))}`);

    const response = await api.messages.parse(
      {
        model: MODEL,
        max_tokens: 1024,
        // Kısa bir sınıflandırma işi: düşünme gecikmeden başka bir şey katmaz.
        // Haiku 5.5'te "disabled" yalnız effort ≤ high ile geçerli.
        thinking: { type: "disabled" },
        output_config: { effort: "low", format: zodOutputFormat(outputSchema) },
        // Sabit istem önbelleğe alınır; değişen cümle yalnız kullanıcı mesajında.
        system: [{ type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } }],
        messages: [{ role: "user", content: lines.join("\n") }],
      },
      { timeout: TIMEOUT_MS },
    );

    if (response.stop_reason === "refusal" || response.stop_reason === "max_tokens") return null;
    if (!response.parsed_output) return null;
    return {
      filters: sanitize(response.parsed_output),
      mode: current && response.parsed_output.mod === "duzenle" ? "refine" : "new",
    };
  } catch (e) {
    console.warn("[voice-search] LLM yedeği kullanılamadı:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Modele gösterilen filtreler: boşlar atılır, alt kategori şemadaki "kategori/alt" biçimine çevrilir. */
function describe(f: VoiceFilters): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const owner = (sub: string) => CATEGORIES.find((c) => c.subcategories.some((s) => s.slug === sub))?.slug;
  for (const [k, v] of Object.entries(f)) {
    // Teknik özellikler şemada yok: kural motoru çözer, düzenlemede çağıran korur.
    if (k === "q" || k === "removed" || k === "specs") continue;
    if (Array.isArray(v) ? v.length : v && typeof v === "object" ? Object.keys(v).length : v !== undefined) {
      out[k] = v;
    }
  }
  if (f.altKategori.length) out.altKategori = f.altKategori.map((s) => `${owner(s)}/${s}`);
  return out;
}

/** Şema zaten kısıtlıyor; yine de taksonomiye karşı ikinci kez doğrulanır. */
function sanitize(o: LlmOutput): VoiceFilters {
  const f = emptyFilters();
  const add = <T>(list: T[], v: T) => {
    if (!list.includes(v)) list.push(v);
  };

  for (const key of o.altKategori) {
    if (!subSet.has(key)) continue;
    const [cat, sub] = key.split("/");
    add(f.kategori, cat);
    add(f.altKategori, sub);
  }
  for (const cat of o.kategori) if (CATEGORY_SLUGS.includes(cat)) add(f.kategori, cat);
  for (const il of o.il) if (PROVINCE_NAMES.includes(il)) add(f.il, il);

  // İlçe ili izler. Kapsamlı değer yalnız gerçekten o ilin ilçesiyse; yalın ad
  // seçili illerden birindeyse, değilse yalnız tek bir ile aitse kabul edilir.
  for (const raw of o.ilce) {
    const { il, ilce } = parseDistrict(raw.trim());
    let owners: string[] = [];
    if (il) {
      if (PROVINCE_NAMES.includes(il) && districtsOf(il).includes(ilce)) owners = [il];
    } else {
      owners = f.il.filter((p) => districtsOf(p).includes(ilce));
      if (!owners.length) {
        const all = PROVINCES.filter((p) => p.districts.includes(ilce)).map((p) => p.name);
        if (all.length === 1) owners = all;
      }
    }
    for (const p of owners) {
      add(f.il, p);
      add(f.ilce, scopedDistrict(p, ilce));
    }
  }

  f.marka = [...new Set(o.marka.filter((b) => brandSet.has(b)))];
  f.periyot = [...new Set(o.periyot.filter((p): p is RentalPeriod => PERIOD_VALUES.includes(p as RentalPeriod)))];
  f.yakit = [...new Set(o.yakit.filter((y): y is FuelType => FUEL_VALUES.includes(y as FuelType)))];
  if (o.operator) f.operator = o.operator;
  if (o.nakliye) f.nakliye = o.nakliye;
  if (o.durum) f.durum = o.durum;
  if (o.sirala && SORT_VALUES.includes(o.sirala as SortKey)) f.sirala = o.sirala as SortKey;

  const money = (n: number) => (Number.isFinite(n) && n > 0 ? Math.round(n) : undefined);
  f.minFiyat = money(o.minFiyat);
  f.maxFiyat = money(o.maxFiyat);
  const year = (n: number) => (Number.isInteger(n) && n >= 1980 && n <= MAX_YEAR + 1 ? n : undefined);
  f.minYil = year(o.minYil);
  f.maxYil = year(o.maxYil);

  const q = o.q.trim().slice(0, 60);
  if (q) f.q = q;
  return f;
}
