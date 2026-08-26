import type { NextRequest } from "next/server";
import { withApi, ok } from "@/lib/api/handler";
import { serializeListing } from "@/lib/api/serialize";
import { AppError } from "@/lib/core/errors";
import { getListingForViewer } from "@/lib/core/listings";
import { similarListings } from "@/lib/db/queries/listings";

export const GET = withApi<{ id: string }>(
  async (_req: NextRequest, ctx) => {
    const { id } = await ctx.params;
    const listing = await getListingForViewer(id, ctx.user?.id);
    if (!listing) throw new AppError("not_found", "İlan bulunamadı.");
    const results = await similarListings(listing, 4);
    return ok({ results: results.map(serializeListing) });
  },
  { auth: "optional" },
);
