import "server-only";

import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { listings } from "../db/schema";
import { getListingById } from "../db/queries/listings";
import { getCategory } from "../categories";
import type { Availability, Listing, ListingStatus, PriceMap, User } from "../types";
import { fail, mutated, ok, type MutationResult, type Result } from "./errors";
import {
  createListingSchema,
  listingStatusSchema,
  updateListingSchema,
  type CreateListingInput,
  type UpdateListingInput,
} from "./schemas";

/**
 * İLAN GÖRÜNÜRLÜK KURALI — tek ev.
 *
 * Aktif olmayan (taslak/pasif) ilan yalnız sahibine görünür; herkese `not_found`.
 * Daha önce web detay sayfası statüye hiç bakmıyordu: UUID'yi bilen herkes
 * başkasının taslak ilanını fiyatıyla, açıklamasıyla okuyabiliyordu. Tahmin
 * edilemez UUID bir erişim denetimi değildir; belgelenmiş bir API'de ise hiç
 * değildir. Ayrıca anonimleştirmenin "ilanlar pasif → erişilemez" varsayımı
 * bu kural olmadan tutmaz.
 *
 * Hem /api/v1 hem web detay sayfası bunu kullanır.
 */
export async function getListingForViewer(
  id: string,
  viewerId?: string,
): Promise<Listing | undefined> {
  const listing = await getListingById(id);
  if (!listing) return undefined;
  if (listing.status !== "aktif" && listing.ownerId !== viewerId) return undefined;
  return listing;
}

const REVALIDATE_LIST = ["/ilanlar", "/hesap/ilanlarim"];

/** "Yayındaki ilan saatlik ücret ister" değişmezi — create ve update'te aynı kural. */
function hourlyPriceMissing(prices: PriceMap | undefined): boolean {
  return prices?.saatlik == null;
}

export async function createListing(
  user: User,
  input: CreateListingInput,
): Promise<MutationResult<{ id: string }>> {
  const parsed = createListingSchema.safeParse(input);
  if (!parsed.success) {
    return fail("validation", parsed.error.issues[0]?.message ?? "İlan bilgileri geçersiz.");
  }
  const d = parsed.data;

  // Kategori/alt kategori kod config'ine karşı doğrulanır.
  const category = getCategory(d.categorySlug);
  if (!category || !category.subcategories.some((s) => s.slug === d.subCategorySlug)) {
    return fail("validation", "Geçersiz kategori seçimi.");
  }

  if (d.status === "aktif" && hourlyPriceMissing(d.prices)) {
    return fail("validation", "Yayınlamak için saatlik ücret zorunludur.");
  }

  // Telefonu olmayan kullanıcının ilanı zorunlu olarak "sadece site içi mesaj".
  const contactPreference = user.phone.trim() ? d.contactPreference : "sadece_mesaj";

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

  return mutated({ id: created.id }, REVALIDATE_LIST);
}

/**
 * İlan güncelleme. jsonb alanlar TAM DEĞİŞİR (bkz. updateListingSchema).
 *
 * Saatlik-fiyat değişmezi burada da kontrol edilir: aksi halde kullanıcı yayındaki
 * bir ilandan saatlik fiyatı çıkarabilir; ilan aramada görünmeye devam eder
 * (relevantPriceExpr'in fallback zinciri sayesinde) ama talep formu tutar
 * hesaplayamaz — ilan geçersiz bir durumda yayında kalır.
 */
export async function updateListing(
  user: User,
  listingId: string,
  input: UpdateListingInput,
): Promise<MutationResult<{ id: string }>> {
  const parsed = updateListingSchema.safeParse(input);
  if (!parsed.success) {
    return fail("validation", parsed.error.issues[0]?.message ?? "İlan bilgileri geçersiz.");
  }
  const d = parsed.data;

  const current = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.ownerId, user.id)),
    columns: { id: true, status: true, prices: true },
  });
  if (!current) return fail("not_found", "İlan bulunamadı veya yetkiniz yok.");

  const nextPrices = d.prices !== undefined ? (d.prices as PriceMap) : current.prices;
  if (current.status === "aktif" && hourlyPriceMissing(nextPrices)) {
    return fail("validation", "Yayındaki ilandan saatlik ücret kaldırılamaz.");
  }

  // Yalnızca gövdede GELEN alanlar yazılır; gelmeyenler dokunulmadan kalır.
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  const assign = <K extends keyof typeof d>(key: K) => {
    if (d[key] !== undefined) patch[key as string] = d[key];
  };
  (
    [
      "title",
      "brand",
      "model",
      "year",
      "city",
      "district",
      "prices",
      "operator",
      "transport",
      "condition",
      "usage",
      "specs",
      "description",
      "minRentalDays",
    ] as const
  ).forEach(assign);
  // Nullable kolonlar: undefined "dokunma", null "temizle" demektir.
  if (d.fuel !== undefined) patch.fuel = d.fuel ?? null;
  if (d.availability !== undefined) patch.availability = d.availability ?? null;
  // Telefonu olmayan kullanıcı telefon paylaşımına geçemez.
  if (d.contactPreference !== undefined) {
    patch.contactPreference = user.phone.trim() ? d.contactPreference : "sadece_mesaj";
  }

  await db.update(listings).set(patch).where(eq(listings.id, listingId));

  return mutated({ id: listingId }, [...REVALIDATE_LIST, `/ilanlar/${listingId}`]);
}

export async function updateListingStatus(
  user: User,
  listingId: string,
  status: ListingStatus,
): Promise<MutationResult<{ id: string }>> {
  if (!listingStatusSchema.safeParse(status).success) {
    return fail("validation", "Geçersiz durum.");
  }

  const current = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.ownerId, user.id)),
    columns: { id: true, prices: true },
  });
  if (!current) return fail("not_found", "İlan bulunamadı veya yetkiniz yok.");

  // Değişmez create/update ile aynı: saatlik ücreti olmayan ilan yayına alınamaz.
  if (status === "aktif" && hourlyPriceMissing(current.prices)) {
    return fail("validation", "Yayınlamak için saatlik ücret zorunludur.");
  }

  await db
    .update(listings)
    .set({ status, updatedAt: new Date() })
    .where(eq(listings.id, listingId));

  return mutated({ id: listingId }, [...REVALIDATE_LIST, `/ilanlar/${listingId}`]);
}

export async function deleteListing(
  user: User,
  listingId: string,
): Promise<MutationResult<{ id: string }>> {
  const result = await db
    .delete(listings)
    .where(and(eq(listings.id, listingId), eq(listings.ownerId, user.id)))
    .returning({ id: listings.id });
  if (!result.length) return fail("not_found", "İlan bulunamadı veya yetkiniz yok.");

  return mutated({ id: listingId }, [...REVALIDATE_LIST, `/ilanlar/${listingId}`]);
}

/** İlan sahipliği doğrulaması — medya uçları paylaşır. */
export async function assertOwnership(
  userId: string,
  listingId: string,
): Promise<Result<{ id: string; videoPath: string | null }>> {
  const listing = await db.query.listings.findFirst({
    where: and(eq(listings.id, listingId), eq(listings.ownerId, userId)),
    columns: { id: true, videoPath: true },
  });
  if (!listing) return fail("not_found", "İlan bulunamadı veya yetkiniz yok.");
  return ok(listing);
}
