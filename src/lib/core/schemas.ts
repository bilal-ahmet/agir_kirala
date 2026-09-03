/**
 * Doğrulama şemalarının TEK kaynağı.
 *
 * Saf modül (server-only YOK): core, server action'lar, /api/v1 route handler'ları,
 * testler ve OpenAPI üreteci aynı şemaları kullanır. Şemalar eskiden action
 * dosyalarında modül-özel const'lardı; JSON API'nin aynı kuralları ikinci kez
 * yazması gerekmesin diye buraya taşındı.
 */

import { z } from "zod";
import { PROVINCE_NAMES } from "../locations";

// ───────── Auth ─────────

export const loginSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  password: z.string().min(1, "Şifrenizi girin."),
});

/**
 * Kayıt alanları. Refine EDİLMEMİŞ hali ayrı export edilir: `.refine()` sonucu
 * `.extend()` kabul etmez, API katmanı ise buna `deviceName` eklemek zorunda.
 */
export const registerObjectSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad girin (en az 2 karakter)."),
  email: z.string().trim().email("Geçerli bir e-posta girin."),
  password: z.string().min(6, "Şifre en az 6 karakter olmalı."),
  // Telefon isteğe bağlı: paylaşmak istemeyenler ilanlarında yalnızca
  // site içi mesajla iletişim kurabilir (bkz. contactPreference).
  phone: z.string().trim().optional(),
  city: z.enum(PROVINCE_NAMES as [string, ...string[]], { message: "Şehir seçin." }),
  type: z.enum(["bireysel", "kurumsal"]),
  companyName: z.string().trim().optional(),
});

/** Kurumsal hesap firma adı zorunlu — hem web hem API'de aynı kural. */
export const requireCompanyName = {
  check: (d: { type: string; companyName?: string }) =>
    d.type !== "kurumsal" || (!!d.companyName && d.companyName.length > 1),
  options: { message: "Firma adı girin.", path: ["companyName"] },
};

export const registerSchema = registerObjectSchema.refine(
  requireCompanyName.check,
  requireCompanyName.options,
);

export const profileSchema = z.object({
  name: z.string().trim().min(2, "Ad soyad girin."),
  phone: z.string().trim().optional(),
  city: z.enum(PROVINCE_NAMES as [string, ...string[]], { message: "Şehir seçin." }),
  companyName: z.string().trim().optional(),
});

export const forgotSchema = z.object({
  email: z.string().trim().email("Geçerli bir e-posta girin."),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Mevcut şifrenizi girin."),
  newPassword: z.string().min(6, "Yeni şifre en az 6 karakter olmalı."),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ProfileInput = z.infer<typeof profileSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

// ───────── İlanlar ─────────

export const priceMapSchema = z.object({
  saatlik: z.number().positive().optional(),
  gunluk: z.number().positive().optional(),
  haftalik: z.number().positive().optional(),
  aylik: z.number().positive().optional(),
  yillik: z.number().positive().optional(),
});

export const availabilitySchema = z.object({
  weekdays: z.array(z.number().int().min(0).max(6)),
  /** "HH:mm" yerel duvar saati — saat dilimi TAŞIMAZ. */
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  /** "YYYY-MM-DD" */
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const createListingSchema = z.object({
  title: z.string().trim().min(3, "İlan başlığı girin."),
  categorySlug: z.string().min(1),
  subCategorySlug: z.string().min(1),
  brand: z.string().trim().min(1, "Marka seçin."),
  model: z.string().trim().default(""),
  year: z.number().int().min(1980).max(new Date().getFullYear() + 1),
  city: z.string().trim().min(1, "Şehir seçin."),
  district: z.string().trim().min(1, "İlçe seçin."),
  prices: priceMapSchema,
  operator: z.boolean().default(false),
  transport: z.enum(["dahil", "ekstra", "yok"]).default("yok"),
  fuel: z.enum(["dizel", "benzin", "elektrik", "lpg", "hibrit"]).optional(),
  condition: z.enum(["sifir", "ikinci_el"]).default("ikinci_el"),
  contactPreference: z.enum(["telefon_mesaj", "sadece_mesaj"]).default("telefon_mesaj"),
  usage: z.number().int().min(0).default(0),
  specs: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  description: z.string().trim().default(""),
  minRentalDays: z.number().int().min(1).default(1),
  availability: availabilitySchema.optional(),
  status: z.enum(["aktif", "taslak"]),
});

/**
 * İlan güncelleme.
 *
 * - Kategori/alt kategori KİLİTLİ: değişmeleri specs şemasıyla uyumsuzluk doğurur.
 * - Statü kendi ucundan (PATCH .../status) yönetilir.
 * - jsonb alanların semantiği TAM DEĞİŞİMDİR: `prices`, `specs`, `availability`
 *   gövdede geldiğinde mevcut değerin yerine bütünüyle geçer. Merge YAPILMAZ —
 *   merge, bir alanı silmeyi imkânsız kılardı. İstemci bu alanları her zaman
 *   tam obje olarak gönderir.
 */
export const updateListingSchema = createListingSchema
  .omit({ categorySlug: true, subCategorySlug: true, status: true })
  .partial();

export const listingStatusSchema = z.enum(["aktif", "pasif", "taslak"]);

export type CreateListingInput = z.input<typeof createListingSchema>;
export type UpdateListingInput = z.input<typeof updateListingSchema>;

// ───────── Talepler ─────────

export const createRentalRequestSchema = z.object({
  listingId: z.string().uuid(),
  /** "YYYY-MM-DD" — yerel gün, saat dilimi taşımaz. */
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Başlangıç tarihi geçersiz."),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Bitiş tarihi geçersiz."),
  period: z.enum(["saatlik", "gunluk", "haftalik", "aylik", "yillik"]),
  message: z.string().trim().max(2000).default(""),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
});

export const updateRequestStatusSchema = z.enum(["onaylandi", "reddedildi", "iptal"]);

export type CreateRentalRequestInput = z.input<typeof createRentalRequestSchema>;

// ───────── Yorumlar ─────────

export const createReviewSchema = z.object({
  rentalRequestId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(2000).default(""),
});

export type CreateReviewInput = z.input<typeof createReviewSchema>;

// ───────── Mesajlar ─────────

export const messageTextSchema = z.string().trim().min(1, "Mesaj boş olamaz.").max(4000);

export const startConversationSchema = z.object({
  listingId: z.string().uuid(),
  text: messageTextSchema,
});

export const sendMessageSchema = z.object({
  text: messageTextSchema,
});

// ───────── Medya ─────────

/** Yuklenebilir medya turu. Saf modulde durur ki "use client" dosyalari da
 * (upload-client) server-only bir modulu cekmeden import edebilsin. */
export type MediaKind = "photo" | "video";

export const uploadTicketSchema = z.object({
  kind: z.enum(["photo", "video"]),
  /**
   * Yalnız video için anlamlı. Foto biletinde format SUNUCU DAYATMASIDIR (.webp),
   * istemciden contentType alınmaz — doğrulama yüzeyi küçülsün diye.
   */
  contentType: z.string().optional(),
  size: z.number().int().positive().optional(),
});

export const registerMediaSchema = z.object({
  kind: z.enum(["photo", "video"]),
  path: z.string().min(1),
  /** Foto için 400 px küçük boy yolu. Yoksa thumbUrl null kaydedilir (hata değil). */
  thumbPath: z.string().min(1).optional(),
});

// ───────── Diğer ─────────

export const toggleFavoriteSchema = z.object({
  listingId: z.string().uuid(),
});
