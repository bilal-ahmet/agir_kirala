import type { NextRequest } from "next/server";
import { withApi, ok } from "@/lib/api/handler";
import { serializeListing } from "@/lib/api/serialize";
import { AppError } from "@/lib/core/errors";
import { getListingForViewer } from "@/lib/core/listings";
import { haulingListings } from "@/lib/db/queries/listings";
import { haulingPlan } from "@/lib/hauling";

/**
 * İş makinesi ilanı için "nakliye için tır" önerileri.
 *
 * `applicable: false` → bu ilan için öneri anlamsız (tır ilanı, kendi yola
 * çıkan makine, nakliye fiyata dahil); istemci bölümü hiç göstermez.
 * `searchParams` "tümünü gör" için GET /listings sorgusudur.
 */
export const GET = withApi<{ id: string }>(
  async (_req: NextRequest, ctx) => {
    const { id } = await ctx.params;
    const listing = await getListingForViewer(id, ctx.user?.id);
    if (!listing) throw new AppError("not_found", "İlan bulunamadı.");

    const plan = haulingPlan(listing);
    if (!plan) return ok({ applicable: false, results: [], searchParams: {} });

    const results = await haulingListings(listing, 4);
    return ok({
      applicable: true,
      results: results.map(serializeListing),
      searchParams: plan.searchParams,
    });
  },
  { auth: "optional" },
);
