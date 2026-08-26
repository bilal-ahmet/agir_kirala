import type { NextRequest } from "next/server";
import { withApi, ok } from "@/lib/api/handler";
import { serializeListing } from "@/lib/api/serialize";
import { activeListings, categoryCounts, countActiveListings } from "@/lib/db/queries/listings";

const DEFAULT_LIMIT = 9;
const MAX_LIMIT = 24;

/**
 * Ana ekran verisi — TEK round-trip.
 *
 * Web ana sayfası bu üç sorguyu ayrı ayrı çağırıyor (RSC'de maliyeti düşük),
 * ama mobilde her gidiş-dönüş pahalı: bu proje ~210 ms'lik DB round-trip
 * bütçesiyle çalışıyor ve şebeke gecikmesi bunun üstüne biniyor. Üç ayrı istek
 * ana ekranı gereksiz yere yavaşlatırdı.
 *
 * `featured` listesi activeListings ile aynı sırayı kullanır
 * ("featured desc, createdAt desc") — web ile aynı ilanlar, aynı sırada.
 */
export const GET = withApi(async (req: NextRequest) => {
  const raw = Number(req.nextUrl.searchParams.get("limit"));
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(Math.trunc(raw), MAX_LIMIT) : DEFAULT_LIMIT;

  const [featured, totalActive, counts] = await Promise.all([
    activeListings(limit),
    countActiveListings(),
    categoryCounts(),
  ]);

  return ok({
    totalActive,
    categoryCounts: counts,
    featured: featured.map(serializeListing),
  });
});
