import type { NextRequest } from "next/server";
import { withApi, ok } from "@/lib/api/handler";
import { serializeListing, toPublicUser } from "@/lib/api/serialize";
import { AppError } from "@/lib/core/errors";
import { getUser } from "@/lib/db/queries/users";
import { activeListingsByOwner } from "@/lib/db/queries/listings";

/** Halka açık satıcı profili — e-posta ve telefon SIZDIRILMAZ. */
export const GET = withApi<{ id: string }>(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  const user = await getUser(id);
  if (!user) throw new AppError("not_found", "Kullanıcı bulunamadı.");

  const listings = await activeListingsByOwner(id);
  return ok({ user: toPublicUser(user), listings: listings.map(serializeListing) });
});
