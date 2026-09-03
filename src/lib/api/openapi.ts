/**
 * OpenAPI 3.1 belgesi — zod şemalarından üretilir.
 *
 * Flutter tarafında Dart model kodunun elle yazılması, API her değiştiğinde
 * sessiz kırılma demekti: TypeScript'te derleyicinin yakaladığı uyumsuzluğu
 * Dart'ta kimse yakalamaz. Bu belge codegen girdisidir.
 *
 * Ek bağımlılık yok: zod 4'ün yerleşik z.toJSONSchema'sı kullanılıyor.
 * Yanıt şeması tanımlanmamış uçlara sahte kesinlik uydurulmaz; açıklama yazılır.
 */

import { z } from "zod";
import {
  changePasswordSchema,
  createListingSchema,
  createRentalRequestSchema,
  createReviewSchema,
  forgotSchema,
  listingStatusBodySchema,
  loginBodySchema,
  profileSchema,
  registerBodySchema,
  registerMediaSchema,
  requestStatusBodySchema,
  sendMessageSchema,
  startConversationSchema,
  toggleFavoriteSchema,
  updateListingSchema,
  uploadTicketSchema,
} from "./schemas";

type Json = Record<string, unknown>;

/**
 * z.toJSONSchema çıktısını temizler:
 * - Alt şemalardaki `$schema` anahtarı (yalnız kök belgede anlamlı; bazı kod
 *   üreteçleri gömülü `$schema` görünce takılıyor).
 * - `z.number().int()`in eklediği ±2^53 sınırları — bilgi taşımayan gürültü.
 */
function clean(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(clean);
  if (node === null || typeof node !== "object") return node;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
    if (key === "$schema") continue;
    if (
      (key === "minimum" || key === "maximum") &&
      typeof value === "number" &&
      Math.abs(value) === Number.MAX_SAFE_INTEGER
    ) {
      continue;
    }
    out[key] = clean(value);
  }
  return out;
}

const jsonSchema = (schema: z.ZodType): Json =>
  clean(z.toJSONSchema(schema, { target: "draft-2020-12", io: "input" })) as Json;

// ───────── Yanıt şemaları ─────────
// Para ve tarih sözleşmesi burada belgelenir: totalPrice/rating STRING'dir.

const photoSchema = z.object({
  id: z.string(),
  thumb: z.string().describe("400 px WebP. Küçük boy yoksa orijinale düşer — asla null değildir."),
  original: z.string().describe("1600 px'e sığdırılmış WebP."),
});

const listingSchema = z
  .object({
    id: z.string(),
    title: z.string(),
    categorySlug: z.string(),
    subCategorySlug: z.string(),
    brand: z.string(),
    model: z.string(),
    year: z.number().int(),
    city: z.string(),
    district: z.string(),
    prices: z
      .record(z.string(), z.number())
      .describe("Periyot → tam sayı TL. Para birimi kuruşsuz olduğu için sayı olarak taşınır."),
    operator: z.boolean(),
    transport: z.enum(["dahil", "ekstra", "yok"]),
    fuel: z.enum(["dizel", "benzin", "elektrik", "lpg", "hibrit"]).optional(),
    condition: z.enum(["sifir", "ikinci_el"]),
    contactPreference: z.enum(["telefon_mesaj", "sadece_mesaj"]),
    videoUrl: z.string().optional(),
    usage: z.number().int(),
    specs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])),
    description: z.string(),
    ownerId: z.string(),
    status: z.enum(["aktif", "pasif", "taslak"]),
    createdAt: z.string().describe("ISO-8601 UTC."),
    featured: z.boolean().optional(),
    minRentalDays: z.number().int().optional(),
    photos: z.array(photoSchema),
    // Yer tutucu: aşağıdaki withRefs bunu $ref Availability ile değiştirir
    // (availabilitySchemaOut bu noktadan sonra tanımlı).
    availability: z.unknown().optional(),
    ownerVerified: z.boolean().optional(),
    ownerRating: z.string().optional().describe("Ondalık STRING (ör. \"4.5\")."),
  })
  .describe("İlan.");

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["bireysel", "kurumsal"]),
  companyName: z.string().optional(),
  verified: z.boolean(),
  rating: z.string().describe("Ondalık STRING (ör. \"4.5\") — float yuvarlama hatası olmasın diye."),
  reviewCount: z.number().int(),
  memberSince: z.string().describe("ISO-8601 UTC."),
  phone: z.string().optional().describe("Halka açık uçlarda yalnız ilan sahibi paylaşmayı seçtiyse."),
  email: z.string().optional().describe("Yalnız /me yanıtında; halka açık uçlarda ASLA."),
  city: z.string(),
  accent: z.string().optional(),
});

const requestSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  renterId: z.string(),
  ownerId: z.string(),
  startDate: z.string().describe("YYYY-MM-DD — yerel gün, saat dilimi taşımaz."),
  endDate: z.string().describe("YYYY-MM-DD"),
  period: z.enum(["saatlik", "gunluk", "haftalik", "aylik", "yillik"]),
  message: z.string(),
  status: z.enum(["beklemede", "onaylandi", "reddedildi", "iptal"]),
  createdAt: z.string().describe("ISO-8601 UTC."),
  totalPrice: z.string().describe("Ondalık STRING (ör. \"16000.00\")."),
});

const messageSchema = z.object({
  id: z.string(),
  senderId: z.string(),
  text: z.string(),
  createdAt: z.string().describe("ISO-8601 UTC."),
});

const conversationSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  participantIds: z.array(z.string()).describe("[kiralayanId, ilanSahibiId]"),
  messages: z.array(messageSchema),
  updatedAt: z.string().describe("ISO-8601 UTC."),
});

const conversationViewSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  listingTitle: z.string(),
  other: z.object({ id: z.string(), name: z.string(), accent: z.string().optional() }),
  messages: z.array(messageSchema).describe("Sohbet başına en fazla son 50 mesaj."),
  unread: z.boolean().describe("Karşı taraftan, son okuma damgamdan sonra mesaj var mı."),
});

const reviewSchema = z.object({
  id: z.string(),
  listingId: z.string(),
  reviewerId: z.string(),
  reviewerName: z.string(),
  rating: z.number().int().min(1).max(5),
  comment: z.string(),
  createdAt: z.string().describe("ISO-8601 UTC."),
});

const sessionSchema = z.object({
  id: z.string(),
  client: z.enum(["web", "mobile"]),
  deviceName: z.string().nullable(),
  lastUsedAt: z.string().describe("ISO-8601 UTC."),
  createdAt: z.string().describe("ISO-8601 UTC."),
  expiresAt: z.string().describe("ISO-8601 UTC."),
  current: z.boolean().describe("İsteği yapan oturumun kendisi mi."),
});

const badgesSchema = z.object({
  pendingIncomingRequests: z.number().int(),
  unreadConversations: z.number().int(),
});

const appConfigSchema = z.object({
  minSupportedVersion: z.object({ ios: z.string(), android: z.string() }),
  maintenance: z.object({ active: z.boolean(), message: z.string().nullable() }),
  storeUrls: z.object({ appStore: z.string().nullable(), playStore: z.string().nullable() }),
});

const signedTargetSchema = z.object({
  signedUrl: z.string(),
  token: z.string().describe("Supabase uploadToSignedUrl(path, token, file) için."),
  path: z.string(),
});

const uploadTicketSchemaOut = z.object({
  kind: z.enum(["photo", "video"]),
  bucket: z.string(),
  original: signedTargetSchema,
  thumb: signedTargetSchema
    .optional()
    .describe("Yalnız fotoğrafta. İstemci 400 px WebP üretip buraya yükler."),
});

/**
 * PriceMap KISMİDİR: sahibi yalnız sunduğu periyotları doldurur.
 *
 * z.record(enum, …) kullanılamaz — zod kapalı bir anahtar kümesini "tam kayıt"
 * sayıp beş periyodu da `required` işaretliyor. Dart codegen o zaman beş
 * non-nullable alan üretir ve yalnız saatlik fiyatı olan bir ilanı ayrıştıramaz.
 */
const priceMapSchemaOut = z
  .object({
    saatlik: z.number().optional(),
    gunluk: z.number().optional(),
    haftalik: z.number().optional(),
    aylik: z.number().optional(),
    yillik: z.number().optional(),
  })
  .describe("Periyot → tam sayı TL. Sahibi yalnız sunduğu periyotları doldurur.");

const specMapSchema = z
  .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
  .describe("Kategoriye özel teknik özellikler (SpecField.key → değer).");

const availabilitySchemaOut = z
  .object({
    weekdays: z.array(z.number().int()).describe("0=Pzt … 6=Pz. Boş = tüm günler."),
    startTime: z.string().optional().describe("HH:mm yerel duvar saati — saat dilimi taşımaz."),
    endTime: z.string().optional().describe("HH:mm yerel duvar saati."),
    dateFrom: z.string().optional().describe("YYYY-MM-DD"),
    dateTo: z.string().optional().describe("YYYY-MM-DD"),
  })
  .describe("İlan sahibinin belirlediği müsaitlik.");

const errorSchema = z
  .object({
    error: z.object({
      code: z
        .enum([
          "unauthorized",
          "forbidden",
          "not_found",
          "validation",
          "conflict",
          "listing_not_active",
          "self_action",
          "already_exists",
          "limit_exceeded",
          "rate_limited",
          "internal",
        ])
        .describe("Sabit makine-okur kod. İstemci AKIŞ KARARLARINI buna göre verir, mesaja bakmaz."),
      message: z.string().describe("Türkçe, kullanıcıya gösterilebilir."),
      fieldErrors: z.record(z.string(), z.string()).optional(),
    }),
  })
  .describe("Tüm hata yanıtlarının ortak zarfı.");

// ───────── Uç kaydı ─────────

// Yanıt gövdeleri $ref ile adlandırılmış bileşenlere bağlanır: aksi halde Dart
// codegen her uç için anonim inline sınıf üretir ve Listing/User tek bir model
// olmaz. Bu yüzden yanıtlar zod yerine doğrudan JSON Schema olarak yazılıyor.
const ref = (name: string): Json => ({ $ref: `#/components/schemas/${name}` });
const arrayOf = (schema: Json): Json => ({ type: "array", items: schema });
const obj = (properties: Json, required?: string[]): Json => ({
  type: "object",
  properties,
  ...(required ? { required } : {}),
});
/** Üretilen şemanın belirli alanlarını $ref ile değiştirir (yalnız var olanları). */
const withRefs = (base: Json, overrides: Record<string, Json>): Json => {
  const props = { ...((base.properties as Json) ?? {}) };
  for (const [key, schema] of Object.entries(overrides)) {
    if (key in props) props[key] = schema;
  }
  return { ...base, properties: props };
};

const nullableRef = (name: string): Json => ({ oneOf: [ref(name), { type: "null" }] });
const listOf = (schema: Json): Json => obj({ results: arrayOf(schema) }, ["results"]);

/**
 * GET /listings sorgu parametreleri — HEPSİ açıkça tanımlı.
 *
 * Bunları q'nun açıklama metnine düzyazı gömmek, kod üretecine yalnızca
 * `searchListings({sayfa, q})` imzası verirdi; uygulamanın ana ekranı olan
 * filtreli arama codegen'in tamamen dışında, elle URL kurularak yazılmak zorunda
 * kalırdı. Enum'lar da yazıldığı için Dart tarafında tip güvenliği bedava gelir.
 *
 * Çoklu seçimler virgülle ayrılır (parseFilters böyle bekliyor):
 * style: "form" + explode: false → `?yakit=dizel,elektrik`.
 */
const csv = (values: readonly string[], description: string): Json => ({
  name: "",
  in: "query",
  required: false,
  style: "form",
  explode: false,
  schema: { type: "array", items: { type: "string", enum: [...values] } },
  description,
});

const named = (name: string, base: Json): Json => ({ ...base, name });

const LISTING_QUERY_PARAMS: Json[] = [
  {
    name: "q",
    in: "query",
    required: false,
    schema: { type: "string" },
    description: "Serbest metin araması (başlık, marka, model).",
  },
  {
    name: "kategori",
    in: "query",
    required: false,
    schema: { type: "string" },
    description: "Kategori slug'ı. Geçerli değerler GET /meta içinde.",
  },
  {
    name: "altKategori",
    in: "query",
    required: false,
    schema: { type: "string" },
    description: "Alt kategori slug'ı.",
  },
  named(
    "marka",
    csv([], "Marka adları, virgülle ayrılmış. Serbest metin — GET /meta içindeki listeden seçilir."),
  ),
  { name: "il", in: "query", required: false, schema: { type: "string" }, description: "İl adı." },
  { name: "ilce", in: "query", required: false, schema: { type: "string" }, description: "İlçe adı." },
  named(
    "periyot",
    csv(
      ["saatlik", "gunluk", "haftalik", "aylik", "yillik"],
      "Fiyatlandırma periyodu. Birden çok seçilirse aralarındaki EN DÜŞÜK fiyat baz alınır.",
    ),
  ),
  {
    name: "minFiyat",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 0 },
    description: "Alt fiyat sınırı (₺). Negatif değerler 0'a çekilir.",
  },
  {
    name: "maxFiyat",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 0 },
    description: "Üst fiyat sınırı (₺).",
  },
  {
    name: "minYil",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 0 },
    description: "En eski model yılı.",
  },
  {
    name: "maxYil",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 0 },
    description: "En yeni model yılı.",
  },
  named("operator", csv(["operatorlu", "operatorsuz"], "Operatörlü / operatörsüz kiralama.")),
  named("nakliye", csv(["var", "yok"], "\"var\" = nakliye dahil veya ekstra.")),
  named("saticiTipi", csv(["bireysel", "kurumsal"], "İlan sahibi tipi.")),
  named("yakit", csv(["dizel", "benzin", "elektrik", "lpg", "hibrit"], "Yakıt tipi.")),
  named("durum", csv(["sifir", "ikinci_el"], "Sıfır / ikinci el.")),
  {
    name: "fotografli",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["1", "true"] },
    description:
      "Varlık bayrağı: \"1\" veya \"true\" → yalnızca fotoğrafı olan ilanlar. Diğer değerler yok sayılır (hata verilmez).",
  },
  {
    name: "videolu",
    in: "query",
    required: false,
    schema: { type: "string", enum: ["1", "true"] },
    description:
      "Varlık bayrağı: \"1\" veya \"true\" → yalnızca videosu olan ilanlar.",
  },
  {
    name: "sirala",
    in: "query",
    required: false,
    schema: {
      type: "string",
      enum: ["onerilen", "yeni", "fiyat-artan", "fiyat-azalan", "yil-yeni", "kullanim-az", "puan"],
      default: "onerilen",
    },
    description: "Sıralama anahtarı.",
  },
  {
    name: "sayfa",
    in: "query",
    required: false,
    schema: { type: "integer", minimum: 1, default: 1 },
    description: "1'den başlayan sayfa numarası (12 ilan/sayfa).",
  },
  {
    // Dinamik olduğu için tek tek yazılamaz: anahtarlar kategoriye göre değişir
    // (GET /meta → categories[].specFields[].key).
    name: "spec_*",
    in: "query",
    required: false,
    schema: { type: "string" },
    description:
      "Kategoriye özel teknik filtre, ör. `spec_operasyonAgirligi=20`. Sayısal alanlarda MİNİMUM eşik, metin alanlarında tam eşleşme. Geçerli anahtarlar GET /meta içinde.",
  },
];

interface Endpoint {
  method: "get" | "post" | "patch" | "delete";
  path: string;
  /** Dart codegen üretilen metot adını buradan alır — kısa ve kararlı tutulur. */
  id: string;
  summary: string;
  auth: boolean;
  params?: string[];
  query?: boolean;
  request?: z.ZodType;
  /** Yanıt gövdesi (JSON Schema). Yoksa yalnız responseNote açıklaması yazılır. */
  response?: Json;
  responseNote?: string;
  status?: number;
}

const ENDPOINTS: Endpoint[] = [
  { method: "get", path: "/health", id: "health", summary: "Sağlık kontrolü (varsayılan hâli DB'ye dokunmaz; ?deep=1 yoklar).", auth: false, response: obj({ ok: { type: "boolean" } }, ["ok"]) },
  { method: "get", path: "/config", id: "getConfig", summary: "Minimum desteklenen sürüm, bakım modu, mağaza adresleri.", auth: false, response: ref("AppConfig") },
  { method: "get", path: "/home", id: "getHome", summary: "Ana ekran verisi tek round-trip: toplam aktif ilan, kategori sayilari, one cikan ilanlar. ?limit ile ilan adedi (varsayilan 9, en fazla 24).", auth: false, response: ref("HomeFeed") },
  { method: "get", path: "/meta", id: "getMeta", summary: "Kategoriler, markalar, iller, etiketler ve limitler (istemci hardcode etmez).", auth: false, responseNote: "Taksonomi ve limit sözlüğü — yapısı src/lib/categories.ts, brands.ts, locations.ts ve constants.ts'ten türer, sürüm sürüm genişleyebilir." },

  { method: "post", path: "/auth/register", id: "register", summary: "Kayıt ve mobil oturum açma.", auth: false, request: registerBodySchema, response: ref("SessionToken"), status: 201 },
  { method: "post", path: "/auth/login", id: "login", summary: "Giriş ve mobil oturum açma.", auth: false, request: loginBodySchema, response: ref("SessionToken") },
  { method: "post", path: "/auth/logout", id: "logout", summary: "Mevcut Bearer oturumunu kapatır.", auth: true, status: 204 },
  { method: "post", path: "/auth/password-forgot", id: "requestPasswordReset", summary: "Şifre sıfırlama e-postası (hesabın varlığından bağımsız aynı yanıt).", auth: false, request: forgotSchema, response: obj({ message: { type: "string" } }, ["message"]) },

  { method: "get", path: "/me", id: "getMe", summary: "Oturum kullanıcısı ve favori id'leri.", auth: true, response: obj({ user: ref("User"), favoriteIds: arrayOf({ type: "string" }) }, ["user", "favoriteIds"]) },
  { method: "patch", path: "/me", id: "updateProfile", summary: "Profil güncelleme.", auth: true, request: profileSchema, response: obj({ user: ref("User") }, ["user"]) },
  { method: "post", path: "/me/password", id: "changePassword", summary: "Şifre değiştirme (mevcut cihaz kalır, diğer oturumlar düşer).", auth: true, request: changePasswordSchema, response: obj({ ok: { type: "boolean" }, closedSessions: { type: "integer" } }, ["ok", "closedSessions"]) },
  { method: "delete", path: "/me", id: "deleteAccount", summary: "Hesap silme = anonimleştirme. Yorum/mesaj/talep geçmişi korunur.", auth: true, status: 204 },
  { method: "get", path: "/me/sessions", id: "listSessions", summary: "Aktif oturumlar (cihazlarım).", auth: true, response: listOf(ref("Session")) },
  { method: "delete", path: "/me/sessions/{id}", id: "revokeSession", summary: "Uzaktan oturum kapatma.", auth: true, params: ["id"], status: 204 },
  { method: "get", path: "/me/badges", id: "getBadges", summary: "Bekleyen talep + okunmamış sohbet sayısı (push yerine polling).", auth: true, response: ref("Badges") },

  { method: "get", path: "/listings", id: "searchListings", summary: "İlan arama. Filtre parametreleri web ile aynı (q, kategori, marka, il, sayfa, spec_*).", auth: false, query: true, response: ref("ListingPage"), responseNote: "12 ilan/sayfa." },
  { method: "post", path: "/listings", id: "createListing", summary: "İlan oluşturma.", auth: true, request: createListingSchema, response: ref("CreatedId"), status: 201 },
  { method: "get", path: "/listings/{id}", id: "getListing", summary: "İlan detayı. Aktif olmayan ilan yalnız sahibine açılır, diğerlerine 404.", auth: false, params: ["id"], response: ref("ListingDetail") },
  { method: "patch", path: "/listings/{id}", id: "updateListing", summary: "İlan güncelleme. prices/specs/availability TAM DEĞİŞİR (merge yok).", auth: true, params: ["id"], request: updateListingSchema, response: ref("Ack") },
  { method: "delete", path: "/listings/{id}", id: "deleteListing", summary: "İlan silme.", auth: true, params: ["id"], status: 204 },
  { method: "patch", path: "/listings/{id}/status", id: "updateListingStatus", summary: "Yayın durumu değiştirme.", auth: true, params: ["id"], request: listingStatusBodySchema, response: ref("Ack") },
  { method: "get", path: "/listings/{id}/similar", id: "getSimilarListings", summary: "Benzer ilanlar.", auth: false, params: ["id"], response: listOf(ref("Listing")) },
  { method: "post", path: "/listings/{id}/upload-ticket", id: "createUploadTicket", summary: "İmzalı yükleme bileti. Fotoda orijinal (1600 px) + küçük boy (400 px), ikisi de WebP.", auth: true, params: ["id"], request: uploadTicketSchema, response: ref("UploadTicket") },
  { method: "post", path: "/listings/{id}/media", id: "registerMedia", summary: "Yükleme sonrası kayıt. thumbPath opsiyoneldir.", auth: true, params: ["id"], request: registerMediaSchema, response: obj({ url: { type: "string" }, thumbUrl: { type: "string" } }, ["url", "thumbUrl"]), status: 201 },
  { method: "delete", path: "/listings/{id}/video", id: "deleteListingVideo", summary: "İlan videosunu siler.", auth: true, params: ["id"], status: 204 },
  { method: "delete", path: "/photos/{photoId}", id: "deletePhoto", summary: "Görseli siler (orijinal + küçük boy).", auth: true, params: ["photoId"], status: 204 },
  { method: "get", path: "/my/listings", id: "getMyListings", summary: "Kendi ilanlarım (taslak ve pasif dahil).", auth: true, response: listOf(ref("Listing")) },

  { method: "get", path: "/favorites", id: "getFavorites", summary: "Favori ilanlar.", auth: true, response: listOf(ref("Listing")) },
  { method: "post", path: "/favorites/toggle", id: "toggleFavorite", summary: "Favoriye ekle/çıkar.", auth: true, request: toggleFavoriteSchema, response: obj({ favorite: { type: "boolean" } }, ["favorite"]) },

  { method: "get", path: "/requests/incoming", id: "getIncomingRequests", summary: "Gelen talepler (ilan sahibi olarak).", auth: true, response: listOf(ref("RequestView")) },
  { method: "get", path: "/requests/outgoing", id: "getOutgoingRequests", summary: "Gönderdiğim talepler.", auth: true, response: listOf(ref("RequestView")) },
  { method: "post", path: "/requests", id: "createRentalRequest", summary: "Kiralama talebi. Aynı tarihlere ikinci bekleyen talep 409 döner.", auth: true, request: createRentalRequestSchema, response: ref("CreatedId"), status: 201 },
  { method: "patch", path: "/requests/{id}/status", id: "updateRequestStatus", summary: "Talep durumu (onayla/reddet ilan sahibi, iptal kiralayan).", auth: true, params: ["id"], request: requestStatusBodySchema, response: ref("Ack") },

  { method: "get", path: "/conversations", id: "getConversations", summary: "Sohbetler (okunmamış bayrağıyla).", auth: true, response: listOf(ref("ConversationView")) },
  { method: "post", path: "/conversations", id: "startConversation", summary: "İlan üzerinden sohbet başlat.", auth: true, request: startConversationSchema, response: obj({ conversationId: { type: "string" }, message: ref("Message") }, ["conversationId", "message"]), status: 201 },
  { method: "get", path: "/conversations/{id}", id: "getConversation", summary: "Sohbet detayı (katılımcı değilse 404).", auth: true, params: ["id"], response: obj({ conversation: ref("Conversation") }, ["conversation"]) },
  { method: "post", path: "/conversations/{id}/messages", id: "sendMessage", summary: "Mesaj gönder.", auth: true, params: ["id"], request: sendMessageSchema, response: obj({ message: ref("Message") }, ["message"]), status: 201 },
  { method: "post", path: "/conversations/{id}/read", id: "markConversationRead", summary: "Sohbeti okundu işaretle.", auth: true, params: ["id"], response: obj({ readAt: { type: "string" } }, ["readAt"]) },

  { method: "get", path: "/users/{id}", id: "getPublicUser", summary: "Halka açık satıcı profili (e-posta sızdırılmaz).", auth: false, params: ["id"], response: obj({ user: ref("User"), listings: arrayOf(ref("Listing")) }, ["user", "listings"]) },
  { method: "get", path: "/users/{id}/reviews", id: "getUserReviews", summary: "Satıcıya yapılan yorumlar.", auth: false, params: ["id"], response: listOf(ref("Review")) },
  { method: "post", path: "/reviews", id: "createReview", summary: "Onaylanmış kiralamaya yorum.", auth: true, request: createReviewSchema, response: ref("CreatedId"), status: 201 },

];

export function buildOpenApiDocument(): Json {
  const paths: Json = {};

  for (const e of ENDPOINTS) {
    const status = e.status ?? 200;
    const responses: Json = {
      [String(status)]: {
        description: e.responseNote ?? "Başarılı.",
        ...(status !== 204 && e.response
          ? { content: { "application/json": { schema: e.response } } }
          : {}),
      },
      "4XX": {
        description: "Hata zarfı. Statü `error.code` tarafından belirlenir.",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
      },
      "5XX": {
        description: "Sunucu hatası — `error.code` her zaman `internal`. Gövde asla iç detay taşımaz.",
        content: {
          "application/json": { schema: { $ref: "#/components/schemas/Error" } },
        },
      },
    };

    const operation: Json = {
      operationId: e.id,
      summary: e.summary,
      // Halka açık uçlarda BOŞ dizi bilinçli: "kimlik doğrulama gerekmez"in
      // OpenAPI'deki karşılığı budur; alanı hiç yazmamak "belirsiz" demektir.
      security: e.auth ? [{ bearerAuth: [] }] : [],
      ...(e.params?.length
        ? {
            parameters: e.params.map((name) => ({
              name,
              in: "path",
              required: true,
              schema: { type: "string" },
            })),
          }
        : {}),
      ...(e.query ? { parameters: LISTING_QUERY_PARAMS } : {}),
      ...(e.request
        ? {
            requestBody: {
              required: true,
              content: { "application/json": { schema: jsonSchema(e.request) } },
            },
          }
        : {}),
      responses,
    };

    const key = `/api/v1${e.path}`;
    paths[key] = { ...((paths[key] as Json) ?? {}), [e.method]: operation };
  }

  return {
    openapi: "3.1.0",
    info: {
      title: "AĞIRKİRALA API",
      version: "1.0.0",
      license: { name: "UNLICENSED", identifier: "UNLICENSED" },
      description:
        "Ağır vasıta & iş makinesi kiralama pazaryeri — mobil istemci API'si.\n\n" +
        "**Kimlik doğrulama:** `Authorization: Bearer <token>`. Token /auth/login veya " +
        "/auth/register ile alınır, 60 gün geçerlidir ve her kullanımda süresi uzar.\n\n" +
        "**Para:** `totalPrice` ve `rating` ondalık STRING'dir (float yuvarlama hatası olmasın diye). " +
        "`prices` tam sayı TL olduğu için sayıdır.\n\n" +
        "**Tarih:** timestamp'ler ISO-8601 UTC; `startDate`/`endDate` `YYYY-MM-DD` (saat dilimi yok); " +
        "`availability.startTime/endTime` `HH:mm` yerel duvar saati.\n\n" +
        "**Hatalar:** her hata `{ error: { code, message, fieldErrors? } }` döner. Akış kararları " +
        "`code` ile verilir — `message` yalnız gösterim içindir ve değişebilir.\n\n" +
        "**Eksik alanlar:** `required` olmayan bir alanın değeri yoksa anahtar yanıttan " +
        "TAMAMEN DÜŞÜRÜLÜR — `null` GÖNDERİLMEZ (ör. `videoUrl`, `fuel`, `companyName`, " +
        "`accent`, `phone`, `ownerRating`). Değeri gerçekten null olabilen alanlar şemada " +
        "açıkça nullable işaretlidir (ör. `Session.deviceName`, `AppConfig.maintenance.message`, " +
        "`ListingDetail.owner`). Dart tarafında ilk gruptaki alanlar nullable tiplerle " +
        "karşılanmalı; ikinci grup zaten nullable olarak üretilir.",
    },
    /**
     * Üretim ÖNCE: kod üreteçleri ilk girdiyi varsayılan basePath olarak gömer.
     * Localhost başta olsaydı üretilen Dart istemcisi yerel makineye istek atardı.
     */
    servers: [
      {
        url: (process.env.NEXT_PUBLIC_SITE_URL ?? "https://agirkirala.example").replace(/\/$/, ""),
        description: "Üretim",
      },
      { url: "http://localhost:3000", description: "Yerel geliştirme" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer" },
      },
      schemas: {
        // Alt nesneler $ref ile bağlanır. Satır içi bırakılsalardı kod üreteci
        // her kullanım için ayrı bir anonim sınıf üretir, Photo/PriceMap tek bir
        // model olmazdı.
        Listing: withRefs(jsonSchema(listingSchema), {
          photos: arrayOf(ref("Photo")),
          prices: ref("PriceMap"),
          specs: ref("SpecMap"),
          availability: ref("Availability"),
        }),
        PriceMap: jsonSchema(priceMapSchemaOut),
        SpecMap: jsonSchema(specMapSchema),
        Availability: jsonSchema(availabilitySchemaOut),
        ListingDetail: obj(
          { listing: ref("Listing"), owner: nullableRef("User") },
          ["listing", "owner"],
        ),
        ListingPage: obj(
          {
            results: arrayOf(ref("Listing")),
            total: { type: "integer" },
            page: { type: "integer" },
            totalPages: { type: "integer" },
          },
          ["results", "total", "page", "totalPages"],
        ),
        User: jsonSchema(userSchema),
        RentalRequest: jsonSchema(requestSchema),
        RequestView: obj(
          {
            request: ref("RentalRequest"),
            listing: nullableRef("Listing"),
            counterpartName: { type: "string" },
          },
          ["request", "listing", "counterpartName"],
        ),
        Photo: jsonSchema(photoSchema),
        Message: jsonSchema(messageSchema),
        Conversation: withRefs(jsonSchema(conversationSchema), {
          messages: arrayOf(ref("Message")),
        }),
        ConversationView: withRefs(jsonSchema(conversationViewSchema), {
          messages: arrayOf(ref("Message")),
        }),
        Review: jsonSchema(reviewSchema),
        Session: jsonSchema(sessionSchema),
        // user alanı $ref ile bağlanır: inline gömülseydi Dart codegen ikinci bir
        // anonim kullanıcı sınıfı üretirdi.
        SessionToken: obj(
          {
            token: {
              type: "string",
              description: "Bearer token. Authorization: Bearer <token> olarak gönderilir.",
            },
            expiresAt: {
              type: "string",
              description: "ISO-8601 UTC. Kullanıldıkça kayan şekilde uzar (60 gün).",
            },
            user: ref("User"),
          },
          ["token", "expiresAt", "user"],
        ),
        Badges: jsonSchema(badgesSchema),
        AppConfig: jsonSchema(appConfigSchema),
        UploadTicket: withRefs(jsonSchema(uploadTicketSchemaOut), {
          original: ref("SignedTarget"),
          thumb: ref("SignedTarget"),
        }),
        SignedTarget: jsonSchema(signedTargetSchema),
        HomeFeed: obj(
          {
            totalActive: { type: "integer" },
            categoryCounts: {
              type: "object",
              additionalProperties: { type: "integer" },
              description: "Kategori slug -> aktif ilan sayisi.",
            },
            featured: arrayOf(ref("Listing")),
          },
          ["totalActive", "categoryCounts", "featured"],
        ),
        CreatedId: obj({ id: { type: "string" } }, ["id"]),
        Ack: obj({ ok: { type: "boolean" } }, ["ok"]),
        Error: jsonSchema(errorSchema),
      },
    },
    paths,
  };
}
