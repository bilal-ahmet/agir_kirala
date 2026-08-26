import type { NextRequest } from "next/server";
import { withApi, ok, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { serializeListing } from "@/lib/api/serialize";
import { createListingSchema } from "@/lib/api/schemas";
import { createListing } from "@/lib/core/listings";
import { searchListings } from "@/lib/db/queries/listings";
import { parseFilters, type RawParams } from "@/lib/filter-params";

/**
 * İlan arama. Filtre parametreleri web ile BİREBİR aynıdır (q, kategori, marka,
 * il, sayfa, spec_*, …) — parseFilters saf bir modül olduğu için olduğu gibi
 * yeniden kullanılıyor, ikinci bir ayrıştırıcı yazılmadı.
 *
 * Sayfalama sayfa-tabanlı kalır (12/sayfa). Bilinçli taviz: sonsuz kaydırma
 * sırasında yeni ilan eklenirse nadiren tekrar/atlama olabilir; 7 sıralama
 * anahtarını cursor'a uyarlamak orantısız iş olurdu.
 */
export const GET = withApi(async (req: NextRequest) => {
  const raw: RawParams = {};
  for (const [key, value] of req.nextUrl.searchParams.entries()) raw[key] = value;

  const result = await searchListings(parseFilters(raw));
  return ok({
    results: result.results.map(serializeListing),
    total: result.total,
    page: result.page,
    totalPages: result.totalPages,
  });
});

export const POST = withApi(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    await enforceRateLimit("listing", user.id);
    const body = await parseJson(req, createListingSchema);
    const { id } = unwrap(await createListing(user, body));
    return ok({ id }, 201);
  },
  { auth: "bearer" },
);
