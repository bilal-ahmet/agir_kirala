// Drizzle şeması — Supabase Postgres. Domain modeli src/lib/types.ts ile birebir eşleşir.
// Not: casing "snake_case" (drizzle.config.ts + index.ts) → camelCase alanlar snake_case kolonlara map'lenir.

import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { Availability, PriceMap } from "../types";

// ───────── Enum'lar (types.ts union tiplerinden) ─────────
export const ownerTypeEnum = pgEnum("owner_type", ["bireysel", "kurumsal"]);
export const transportOptionEnum = pgEnum("transport_option", ["dahil", "ekstra", "yok"]);
export const fuelTypeEnum = pgEnum("fuel_type", ["dizel", "benzin", "elektrik", "lpg", "hibrit"]);
export const listingStatusEnum = pgEnum("listing_status", ["aktif", "pasif", "taslak"]);
export const requestStatusEnum = pgEnum("request_status", [
  "beklemede",
  "onaylandi",
  "reddedildi",
  "iptal",
]);
export const rentalPeriodEnum = pgEnum("rental_period", [
  "saatlik",
  "gunluk",
  "haftalik",
  "aylik",
  "yillik",
]);
export const listingConditionEnum = pgEnum("listing_condition", ["sifir", "ikinci_el"]);
export const contactPreferenceEnum = pgEnum("contact_preference", [
  "telefon_mesaj",
  "sadece_mesaj",
]);
/** Oturumun hangi istemciden açıldığı — web cookie (24s) vs mobil bearer (60g kayan). */
export const sessionClientEnum = pgEnum("session_client", ["web", "mobile"]);

// ───────── users ─────────
export const users = pgTable(
  "users",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    // Her zaman küçük harfe normalize edilerek yazılır (case-insensitive login).
    email: text("email").notNull(),
    passwordHash: text("password_hash").notNull(),
    type: ownerTypeEnum("type").notNull().default("bireysel"),
    companyName: text("company_name"),
    verified: boolean("verified").notNull().default(false),
    // reviews tablosundan denormalize (recomputeUserRating ile güncellenir).
    rating: numeric("rating", { precision: 2, scale: 1 }).notNull().default("0"),
    reviewCount: integer("review_count").notNull().default(0),
    phone: text("phone").notNull().default(""),
    city: text("city").notNull().default(""),
    accent: text("accent"),
    memberSince: timestamp("member_since", { withTimezone: true }).notNull().defaultNow(),
    // Hesap silme = anonimleştirme. Dolu ise oturum açılamaz ve mevcut oturumlar
    // reddedilir; satır silinmez ki karşı tarafın mesaj/talep/yorum geçmişi kırılmasın.
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique("users_email_unique").on(t.email)],
);

// ───────── listings ─────────
export const listings = pgTable(
  "listings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    categorySlug: text("category_slug").notNull(),
    subCategorySlug: text("sub_category_slug").notNull(),
    brand: text("brand").notNull(),
    model: text("model").notNull(),
    year: integer("year").notNull(),
    city: text("city").notNull(),
    district: text("district").notNull(),
    prices: jsonb("prices").$type<PriceMap>().notNull().default({}),
    operator: boolean("operator").notNull().default(false),
    transport: transportOptionEnum("transport").notNull().default("yok"),
    fuel: fuelTypeEnum("fuel"),
    condition: listingConditionEnum("condition").notNull().default("ikinci_el"),
    // İlan sahibi telefonunu paylaşmak istemiyorsa "sadece_mesaj" seçer.
    contactPreference: contactPreferenceEnum("contact_preference")
      .notNull()
      .default("telefon_mesaj"),
    // İlan başına tek tanıtım videosu (Supabase Storage).
    videoUrl: text("video_url"),
    videoPath: text("video_path"),
    usage: integer("usage").notNull().default(0),
    specs: jsonb("specs")
      .$type<Record<string, string | number | boolean>>()
      .notNull()
      .default({}),
    description: text("description").notNull().default(""),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: listingStatusEnum("status").notNull().default("taslak"),
    featured: boolean("featured").notNull().default(false),
    minRentalDays: integer("min_rental_days"),
    availability: jsonb("availability").$type<Availability>(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("listings_category_idx").on(t.categorySlug),
    index("listings_sub_category_idx").on(t.subCategorySlug),
    index("listings_city_idx").on(t.city),
    index("listings_brand_idx").on(t.brand),
    index("listings_status_idx").on(t.status),
    index("listings_owner_idx").on(t.ownerId),
    index("listings_featured_idx").on(t.featured),
    index("listings_year_idx").on(t.year),
    index("listings_created_idx").on(t.createdAt),
    index("listings_condition_idx").on(t.condition),
    index("listings_video_idx").on(t.videoUrl),
    index("listings_specs_gin").using("gin", t.specs),
  ],
);

// ───────── listing_photos (net-new gerçek görseller) ─────────
export const listingPhotos = pgTable(
  "listing_photos",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    storagePath: text("storage_path").notNull(),
    // Liste/kart görünümü için 400 px WebP küçük boy. NULLABLE olması kritik:
    // eski satırlar bozulmaz, serializer thumb için url'e düşer (thumbUrl ?? url).
    thumbUrl: text("thumb_url"),
    thumbStoragePath: text("thumb_storage_path"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("listing_photos_listing_idx").on(t.listingId, t.sortOrder)],
);

// ───────── rental_requests ─────────
export const rentalRequests = pgTable(
  "rental_requests",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    renterId: uuid("renter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    period: rentalPeriodEnum("period").notNull(),
    message: text("message").notNull().default(""),
    status: requestStatusEnum("status").notNull().default("beklemede"),
    totalPrice: numeric("total_price", { precision: 14, scale: 2 }).notNull().default("0"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("requests_owner_idx").on(t.ownerId),
    index("requests_renter_idx").on(t.renterId),
    index("requests_listing_idx").on(t.listingId),
    /**
     * Idempotency: mobil ağda aynı POST iki kez gidebilir (çift dokunma, timeout
     * sonrası retry). Aynı ilan + kiralayan + tarih aralığı için yalnızca TEK
     * "beklemede" talep olabilir. Kısmi index olması bilinçli: talep iptal/red
     * edildikten sonra aynı tarihlere yeniden talep atılabilir.
     */
    uniqueIndex("rental_requests_dedupe")
      .on(t.listingId, t.renterId, t.startDate, t.endDate)
      .where(sql`status = 'beklemede'`),
  ],
);

// ───────── conversations ─────────
export const conversations = pgTable(
  "conversations",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    renterId: uuid("renter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Okundu takibi: sohbetin tam iki sabit katılımcısı olduğu için ayrı tablo
    // yerine iki sütun yeter. "Okunmamış" = karşı taraftan, benim damgamdan yeni mesaj.
    renterLastReadAt: timestamp("renter_last_read_at", { withTimezone: true }),
    ownerLastReadAt: timestamp("owner_last_read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    // Aynı ilan + (kiralayan, sahip) ikilisi için tek sohbet.
    unique("conversations_unique").on(t.listingId, t.renterId, t.ownerId),
    index("conversations_renter_idx").on(t.renterId),
    index("conversations_owner_idx").on(t.ownerId),
  ],
);

// ───────── messages ─────────
export const messages = pgTable(
  "messages",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    conversationId: uuid("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: uuid("sender_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("messages_conversation_idx").on(t.conversationId, t.createdAt)],
);

// ───────── favorites ─────────
export const favorites = pgTable(
  "favorites",
  {
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.listingId] })],
);

// ───────── reviews (net-new) ─────────
export const reviews = pgTable(
  "reviews",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    listingId: uuid("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    reviewerId: uuid("reviewer_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    targetUserId: uuid("target_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    rentalRequestId: uuid("rental_request_id").references(() => rentalRequests.id, {
      onDelete: "set null",
    }),
    rating: integer("rating").notNull(),
    comment: text("comment").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    check("reviews_rating_range", sql`${t.rating} between 1 and 5`),
    // Bir kiralamaya tek yorum.
    unique("reviews_request_unique").on(t.rentalRequestId),
    index("reviews_target_idx").on(t.targetUserId),
  ],
);

// ───────── sessions ─────────
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // Cookie'deki / Bearer başlığındaki ham token'ın SHA-256 hash'i (ham token DB'de tutulmaz).
    tokenHash: text("token_hash").notNull(),
    // web: cookie, 24 saat sabit. mobile: Bearer, 60 gün kayan (günde en çok bir yazma).
    client: sessionClientEnum("client").notNull().default("web"),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }).notNull().defaultNow(),
    /** "iPhone 15 · AĞIRKİRALA" gibi — "cihazlarım" ekranında gösterilir. */
    deviceName: text("device_name"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("sessions_token_unique").on(t.tokenHash),
    index("sessions_user_idx").on(t.userId),
    // Süresi geçmiş oturumların toplu temizliği için.
    index("sessions_expires_idx").on(t.expiresAt),
  ],
);

// ───────── rate_limits ─────────
// Vercel serverless'te süreç-içi sayaç işe yaramaz (her istek ayrı lambda olabilir),
// bu yüzden sabit pencereli sayaç DB'de tutulur.
export const rateLimits = pgTable(
  "rate_limits",
  {
    key: text("key").primaryKey(),
    count: integer("count").notNull().default(0),
    resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  },
  (t) => [index("rate_limits_reset_idx").on(t.resetAt)],
);

// ───────── password_reset_tokens ─────────
export const passwordResetTokens = pgTable(
  "password_reset_tokens",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // sessions ile aynı yaklaşım: ham token yalnızca e-postadaki linkte, DB'de SHA-256'sı.
    tokenHash: text("token_hash").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    usedAt: timestamp("used_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique("password_reset_token_unique").on(t.tokenHash),
    index("password_reset_user_idx").on(t.userId),
  ],
);

// ───────── İlişkiler ─────────
export const usersRelations = relations(users, ({ many }) => ({
  listings: many(listings),
  incomingRequests: many(rentalRequests, { relationName: "ownerRequests" }),
  outgoingRequests: many(rentalRequests, { relationName: "renterRequests" }),
  favorites: many(favorites),
  reviewsWritten: many(reviews, { relationName: "reviewer" }),
  reviewsReceived: many(reviews, { relationName: "target" }),
  sessions: many(sessions),
  passwordResetTokens: many(passwordResetTokens),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  owner: one(users, { fields: [listings.ownerId], references: [users.id] }),
  photos: many(listingPhotos),
  requests: many(rentalRequests),
  conversations: many(conversations),
  reviews: many(reviews),
  favoritedBy: many(favorites),
}));

export const listingPhotosRelations = relations(listingPhotos, ({ one }) => ({
  listing: one(listings, { fields: [listingPhotos.listingId], references: [listings.id] }),
}));

export const rentalRequestsRelations = relations(rentalRequests, ({ one }) => ({
  listing: one(listings, { fields: [rentalRequests.listingId], references: [listings.id] }),
  renter: one(users, {
    fields: [rentalRequests.renterId],
    references: [users.id],
    relationName: "renterRequests",
  }),
  owner: one(users, {
    fields: [rentalRequests.ownerId],
    references: [users.id],
    relationName: "ownerRequests",
  }),
}));

export const conversationsRelations = relations(conversations, ({ one, many }) => ({
  listing: one(listings, { fields: [conversations.listingId], references: [listings.id] }),
  renter: one(users, { fields: [conversations.renterId], references: [users.id] }),
  owner: one(users, { fields: [conversations.ownerId], references: [users.id] }),
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, { fields: [messages.senderId], references: [users.id] }),
}));

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, { fields: [favorites.userId], references: [users.id] }),
  listing: one(listings, { fields: [favorites.listingId], references: [listings.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  listing: one(listings, { fields: [reviews.listingId], references: [listings.id] }),
  reviewer: one(users, {
    fields: [reviews.reviewerId],
    references: [users.id],
    relationName: "reviewer",
  }),
  target: one(users, {
    fields: [reviews.targetUserId],
    references: [users.id],
    relationName: "target",
  }),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const passwordResetTokensRelations = relations(passwordResetTokens, ({ one }) => ({
  user: one(users, { fields: [passwordResetTokens.userId], references: [users.id] }),
}));


// ───────── Çıkarımsal tipler ─────────
export type UserRow = typeof users.$inferSelect;
export type ListingRow = typeof listings.$inferSelect;
export type ListingPhotoRow = typeof listingPhotos.$inferSelect;
export type RentalRequestRow = typeof rentalRequests.$inferSelect;
export type ConversationRow = typeof conversations.$inferSelect;
export type MessageRow = typeof messages.$inferSelect;
export type ReviewRow = typeof reviews.$inferSelect;
export type SessionRow = typeof sessions.$inferSelect;
export type PasswordResetTokenRow = typeof passwordResetTokens.$inferSelect;
