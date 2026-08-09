"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { listings } from "../db/schema";
import { verifySession } from "../auth/session";
import { getCategory } from "../categories";
import type {
  Availability,
  ContactPreference,
  FuelType,
  ListingCondition,
  ListingStatus,
  PriceMap,
  TransportOption,
} from "../types";

const priceMapSchema = z.object({
  saatlik: z.number().positive().optional(),
  gunluk: z.number().positive().optional(),
  haftalik: z.number().positive().optional(),
  aylik: z.number().positive().optional(),
  yillik: z.number().positive().optional(),
});

const availabilitySchema = z.object({
  weekdays: z.array(z.number().int().min(0).max(6)),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

const createListingSchema = z.object({
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

/** Genel giriş tipi (zod'un tam-record çıkarımından bağımsız — prices Partial). */
export interface CreateListingInput {
  title: string;
  categorySlug: string;
  subCategorySlug: string;
  brand: string;
  model?: string;
  year: number;
  city: string;
  district: string;
  prices: PriceMap;
  operator?: boolean;
  transport?: TransportOption;
  fuel?: FuelType;
  condition?: ListingCondition;
  contactPreference?: ContactPreference;
  usage?: number;
  specs?: Record<string, string | number | boolean>;
  description?: string;
  minRentalDays?: number;
  availability?: Availability;
  status: "aktif" | "taslak";
}

export async function createListingAction(
  input: CreateListingInput,
): Promise<{ id?: string; error?: string }> {
  const user = await verifySession();

  const parsed = createListingSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "İlan bilgileri geçersiz." };
  }
  const d = parsed.data;

  // Kategori/alt kategori kod config'ine karşı doğrulanır.
  const category = getCategory(d.categorySlug);
  if (!category || !category.subcategories.some((s) => s.slug === d.subCategorySlug)) {
    return { error: "Geçersiz kategori seçimi." };
  }

  // Yayınlamak için saatlik ücret zorunlu.
  if (d.status === "aktif" && d.prices.saatlik == null) {
    return { error: "Yayınlamak için saatlik ücret zorunludur." };
  }

  // Telefonu olmayan kullanıcının ilanı zorunlu olarak "sadece site içi mesaj".
  const contactPreference: ContactPreference = user.phone.trim()
    ? d.contactPreference
    : "sadece_mesaj";

  const [created] = await db
    .insert(listings)
    .values({
      title: d.title,
      categorySlug: d.categorySlug,
      subCategorySlug: d.subCategorySlug,
      brand: d.brand,
      model: d.model,
      year: d.year,
      city: d.city,
      district: d.district,
      prices: d.prices as PriceMap,
      operator: d.operator,
      transport: d.transport,
      fuel: d.fuel ?? null,
      condition: d.condition,
      contactPreference,
      usage: d.usage,
      specs: d.specs,
      description: d.description,
      ownerId: user.id,
      status: d.status as ListingStatus,
      minRentalDays: d.minRentalDays,
      availability: (d.availability as Availability | undefined) ?? null,
    })
    .returning({ id: listings.id });

  revalidatePath("/hesap/ilanlarim");
  revalidatePath("/ilanlar");
  return { id: created.id };
}

const statusSchema = z.enum(["aktif", "pasif", "taslak"]);

export async function updateListingStatusAction(
  listingId: string,
  status: ListingStatus,
): Promise<{ error?: string }> {
  const user = await verifySession();
  if (!statusSchema.safeParse(status).success) return { error: "Geçersiz durum." };

  const result = await db
    .update(listings)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(listings.id, listingId), eq(listings.ownerId, user.id)))
    .returning({ id: listings.id });

  if (!result.length) return { error: "İlan bulunamadı veya yetkiniz yok." };

  revalidatePath("/hesap/ilanlarim");
  revalidatePath(`/ilanlar/${listingId}`);
  revalidatePath("/ilanlar");
  return {};
}

export async function deleteListingAction(listingId: string): Promise<{ error?: string }> {
  const user = await verifySession();
  const result = await db
    .delete(listings)
    .where(and(eq(listings.id, listingId), eq(listings.ownerId, user.id)))
    .returning({ id: listings.id });
  if (!result.length) return { error: "İlan bulunamadı veya yetkiniz yok." };

  revalidatePath("/hesap/ilanlarim");
  revalidatePath("/ilanlar");
  return {};
}
