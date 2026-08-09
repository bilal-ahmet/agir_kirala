import "server-only";

import { cache } from "react";
import {
  and,
  asc,
  desc,
  eq,
  exists,
  gte,
  inArray,
  isNotNull,
  lte,
  ne,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import { db } from "../index";
import { listingPhotos, listings, users } from "../schema";
import type { ListingPhotoRow, ListingRow } from "../schema";
import { RESULTS_PER_PAGE, TRANSPORT_VAR_VALUES } from "../../constants";
import type {
  FilterState,
  Listing,
  RentalPeriod,
  SortKey,
  TransportOption,
} from "../../types";
import { toListing } from "./mappers";

/** İlgili fiyat (₺) SQL ifadesi: periyot seçiliyse o periyot, değilse primaryPrice sırası. */
function relevantPriceExpr(period?: RentalPeriod): SQL {
  if (period) return sql`(${listings.prices}->>${period})::numeric`;
  // primaryPrice sırası: gunluk > saatlik > haftalik > aylik > yillik (format.ts ile aynı).
  return sql`coalesce(
    ${listings.prices}->>'gunluk',
    ${listings.prices}->>'saatlik',
    ${listings.prices}->>'haftalik',
    ${listings.prices}->>'aylik',
    ${listings.prices}->>'yillik'
  )::numeric`;
}

/** FilterState → WHERE koşulları (filters.ts matches() ile eşdeğer). */
function buildConditions(f: FilterState): SQL[] {
  const c: SQL[] = [eq(listings.status, "aktif")];

  if (f.q) {
    const pat = `%${f.q}%`;
    c.push(
      or(
        sql`${listings.title} ilike ${pat}`,
        sql`${listings.brand} ilike ${pat}`,
        sql`${listings.model} ilike ${pat}`,
      )!,
    );
  }
  if (f.kategori) c.push(eq(listings.categorySlug, f.kategori));
  if (f.altKategori) c.push(eq(listings.subCategorySlug, f.altKategori));
  if (f.marka?.length) c.push(inArray(listings.brand, f.marka));
  if (f.il) c.push(eq(listings.city, f.il));
  if (f.ilce) c.push(eq(listings.district, f.ilce));
  if (f.periyot) c.push(sql`jsonb_exists(${listings.prices}, ${f.periyot})`);

  const price = relevantPriceExpr(f.periyot);
  if (f.minFiyat != null) c.push(sql`${price} >= ${f.minFiyat}`);
  if (f.maxFiyat != null) c.push(sql`${price} <= ${f.maxFiyat}`);

  if (f.minYil != null) c.push(gte(listings.year, f.minYil));
  if (f.maxYil != null) c.push(lte(listings.year, f.maxYil));

  // Operatör: her ikisi de seçiliyse (ya da hiçbiri) koşul eklenmez.
  if (f.operator?.length === 1) {
    c.push(eq(listings.operator, f.operator[0] === "operatorlu"));
  }

  // Nakliye: "var" → dahil|ekstra, "yok" → yok. İkisi de seçiliyse koşul yok.
  if (f.nakliye?.length) {
    const allowed = f.nakliye.flatMap((n) =>
      n === "var" ? TRANSPORT_VAR_VALUES : (["yok"] as TransportOption[]),
    );
    if (allowed.length < 3) c.push(inArray(listings.transport, allowed));
  }

  if (f.yakit?.length) c.push(inArray(listings.fuel, f.yakit));
  if (f.durum?.length) c.push(inArray(listings.condition, f.durum));
  if (f.saticiTipi?.length) c.push(inArray(users.type, f.saticiTipi));

  // Medya filtreleri.
  if (f.fotografli) {
    c.push(
      exists(
        db
          .select({ one: sql`1` })
          .from(listingPhotos)
          .where(eq(listingPhotos.listingId, listings.id)),
      ),
    );
  }
  if (f.videolu) c.push(isNotNull(listings.videoUrl));

  if (f.specs) {
    for (const [key, cond] of Object.entries(f.specs)) {
      if (typeof cond === "number") {
        c.push(sql`(${listings.specs}->>${key})::numeric >= ${cond}`);
      } else {
        c.push(sql`${listings.specs}->>${key} = ${cond}`);
      }
    }
  }
  return c;
}

/** SortKey → ORDER BY ifadeleri (filters.ts sortListings ile eşdeğer). */
function buildOrderBy(sort: SortKey, period?: RentalPeriod): SQL[] {
  const price = relevantPriceExpr(period);
  switch (sort) {
    case "yeni":
      return [desc(listings.createdAt)];
    case "fiyat-artan":
      return [sql`${price} asc nulls last`];
    case "fiyat-azalan":
      return [sql`${price} desc nulls last`];
    case "yil-yeni":
      return [desc(listings.year)];
    case "kullanim-az":
      return [asc(listings.usage)];
    case "puan":
      return [desc(users.rating)];
    case "onerilen":
    default:
      return [desc(listings.featured), desc(listings.createdAt)];
  }
}

/** Sonuç kümesi için foto satırlarını toplu getir ve id→foto[] eşlemesi kur. */
async function photosByListing(ids: string[]): Promise<Map<string, ListingPhotoRow[]>> {
  const map = new Map<string, ListingPhotoRow[]>();
  if (!ids.length) return map;
  const rows = await db.select().from(listingPhotos).where(inArray(listingPhotos.listingId, ids));
  for (const r of rows) {
    const arr = map.get(r.listingId) ?? [];
    arr.push(r);
    map.set(r.listingId, arr);
  }
  return map;
}

/** İlan sahibi özetlerini toplu getir (kart rozet/puan için). */
async function ownersByIds(ids: string[]): Promise<Map<string, { verified: boolean; rating: string }>> {
  const map = new Map<string, { verified: boolean; rating: string }>();
  if (!ids.length) return map;
  const rows = await db
    .select({ id: users.id, verified: users.verified, rating: users.rating })
    .from(users)
    .where(inArray(users.id, ids));
  for (const r of rows) map.set(r.id, { verified: r.verified, rating: r.rating });
  return map;
}

/** İlan satırlarını foto + sahip özetiyle Listing'e dönüştürür (toplu). */
async function hydrate(rows: ListingRow[]): Promise<Listing[]> {
  if (!rows.length) return [];
  const [photoMap, ownerMap] = await Promise.all([
    photosByListing(rows.map((l) => l.id)),
    ownersByIds([...new Set(rows.map((l) => l.ownerId))]),
  ]);
  return rows.map((l) => toListing(l, photoMap.get(l.id) ?? [], ownerMap.get(l.ownerId)));
}

export interface SearchResult {
  results: Listing[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * Aktif ilanları filtreler, sıralar ve sayfalar.
 * React cache()'li: /ilanlar sayfasında sonuç sayısı ile ızgara ayrı Suspense
 * sınırlarında ama AYNI `filters` nesne referansıyla çağrılır → tek sorgu seti.
 */
export const searchListings = cache(async function searchListings(
  f: FilterState,
): Promise<SearchResult> {
  const conditions = buildConditions(f);
  const where = and(...conditions);

  // Sayım ve sayfa sorgusu birbirine bağlı değil → paralel çalıştır.
  const requestedPage = Math.max(f.sayfa ?? 1, 1);
  const [countRows, rows] = await Promise.all([
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(listings)
      .innerJoin(users, eq(listings.ownerId, users.id))
      .where(where),
    db
      .select({ listing: listings, ownerVerified: users.verified, ownerRating: users.rating })
      .from(listings)
      .innerJoin(users, eq(listings.ownerId, users.id))
      .where(where)
      .orderBy(...buildOrderBy(f.sirala ?? "onerilen", f.periyot))
      .limit(RESULTS_PER_PAGE)
      .offset((requestedPage - 1) * RESULTS_PER_PAGE),
  ]);

  const total = countRows[0].total;
  const totalPages = Math.max(1, Math.ceil(total / RESULTS_PER_PAGE));
  // İstenen sayfa aralık dışındaysa son sayfaya çekilir; o durumda sayfayı yeniden çek.
  const page = Math.min(requestedPage, totalPages);
  const pageRows =
    page === requestedPage
      ? rows
      : await db
          .select({ listing: listings, ownerVerified: users.verified, ownerRating: users.rating })
          .from(listings)
          .innerJoin(users, eq(listings.ownerId, users.id))
          .where(where)
          .orderBy(...buildOrderBy(f.sirala ?? "onerilen", f.periyot))
          .limit(RESULTS_PER_PAGE)
          .offset((page - 1) * RESULTS_PER_PAGE);

  const photoMap = await photosByListing(pageRows.map((r) => r.listing.id));
  const results = pageRows.map((r) =>
    toListing(r.listing, photoMap.get(r.listing.id) ?? [], {
      verified: r.ownerVerified,
      rating: r.ownerRating,
    }),
  );

  return { results, total, page, totalPages };
});

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Tek ilan (foto ile). Geçersiz uuid'de undefined döner.
 * React cache() ile sarılı: detay sayfasında hem generateMetadata hem page aynı
 * ilanı istiyor; bu sayede sorgu istek başına bir kez çalışır.
 */
export const getListingById = cache(async (id: string): Promise<Listing | undefined> => {
  if (!UUID_RE.test(id)) return undefined;
  const row = await db.query.listings.findFirst({ where: eq(listings.id, id) });
  if (!row) return undefined;
  const [photos, ownerMap] = await Promise.all([
    db.select().from(listingPhotos).where(eq(listingPhotos.listingId, id)),
    ownersByIds([row.ownerId]),
  ]);
  return toListing(row, photos, ownerMap.get(row.ownerId));
});

/** Eskiden yerel/tohum ayrımı vardı; artık tek kaynak. */
export const findAnyListing = getListingById;

/** Bir kategorideki aktif ilan sayısı (kategori grid sayaçları). */
export async function countByCategory(categorySlug: string): Promise<number> {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(listings)
    .where(and(eq(listings.status, "aktif"), eq(listings.categorySlug, categorySlug)));
  return total;
}

/** Tüm kategoriler için aktif ilan sayıları (tek sorgu). */
export async function categoryCounts(): Promise<Record<string, number>> {
  const rows = await db
    .select({ slug: listings.categorySlug, total: sql<number>`count(*)::int` })
    .from(listings)
    .where(eq(listings.status, "aktif"))
    .groupBy(listings.categorySlug);
  return Object.fromEntries(rows.map((r) => [r.slug, r.total]));
}

/** Toplam aktif ilan sayısı. Ana sayfa hem Hero'da hem gövdede istediği için cache'li. */
export const countActiveListings = cache(async (): Promise<number> => {
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(listings)
    .where(eq(listings.status, "aktif"));
  return total;
});

/** Aktif ilanlar (ana sayfa gridini doldurmak için). */
export async function activeListings(limit = 60): Promise<Listing[]> {
  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.status, "aktif"))
    .orderBy(desc(listings.featured), desc(listings.createdAt))
    .limit(limit);
  return hydrate(rows);
}

/** Öne çıkan aktif ilanlar (ana sayfa). */
export async function featuredListings(limit = 8): Promise<Listing[]> {
  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.status, "aktif"))
    .orderBy(desc(listings.featured), desc(listings.createdAt))
    .limit(limit);
  return hydrate(rows);
}

/** Benzer ilanlar — aynı kategori, kendisi hariç. */
export async function similarListings(listing: Listing, limit = 4): Promise<Listing[]> {
  const rows = await db
    .select()
    .from(listings)
    .where(
      and(
        eq(listings.status, "aktif"),
        eq(listings.categorySlug, listing.categorySlug),
        ne(listings.id, listing.id),
      ),
    )
    .limit(limit);
  return hydrate(rows);
}

/** Bir satıcının yayındaki ilanları (satıcı profil sayfası). */
export async function activeListingsByOwner(ownerId: string): Promise<Listing[]> {
  const rows = await db
    .select()
    .from(listings)
    .where(and(eq(listings.ownerId, ownerId), eq(listings.status, "aktif")))
    .orderBy(desc(listings.featured), desc(listings.createdAt));
  return hydrate(rows);
}

/** Bir kullanıcının tüm ilanları (her durum, foto ile), en yeni önce. */
export async function myListings(userId: string): Promise<Listing[]> {
  const rows = await db
    .select()
    .from(listings)
    .where(eq(listings.ownerId, userId))
    .orderBy(desc(listings.createdAt));
  return hydrate(rows);
}
