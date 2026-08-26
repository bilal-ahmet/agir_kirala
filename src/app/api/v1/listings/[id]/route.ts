import type { NextRequest } from "next/server";
import { withApi, noContent, ok, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { serializeListing, toPublicUser } from "@/lib/api/serialize";
import { updateListingSchema } from "@/lib/api/schemas";
import { AppError } from "@/lib/core/errors";
import { deleteListing, getListingForViewer, updateListing } from "@/lib/core/listings";
import { getUser } from "@/lib/db/queries/users";

/**
 * İlan detayı. Aktif olmayan ilan yalnız sahibine görünür (getListingForViewer);
 * başkasına 404. Eskiden statü hiç kontrol edilmiyordu ve UUID'yi bilen herkes
 * taslak ilanı okuyabiliyordu.
 */
export const GET = withApi<{ id: string }>(
  async (_req: NextRequest, ctx) => {
    const { id } = await ctx.params;
    const listing = await getListingForViewer(id, ctx.user?.id);
    if (!listing) throw new AppError("not_found", "İlan bulunamadı.");

    const owner = await getUser(listing.ownerId);
    const sharePhone = listing.contactPreference === "telefon_mesaj";
    return ok({
      listing: serializeListing(listing),
      owner: owner ? toPublicUser(owner, sharePhone) : null,
    });
  },
  { auth: "optional" },
);

export const PATCH = withApi<{ id: string }>(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const { id } = await ctx.params;
    const body = await parseJson(req, updateListingSchema);
    unwrap(await updateListing(user, id, body));
    return ok({ ok: true });
  },
  { auth: "bearer" },
);

export const DELETE = withApi<{ id: string }>(
  async (_req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const { id } = await ctx.params;
    unwrap(await deleteListing(user, id));
    return noContent();
  },
  { auth: "bearer" },
);
