import type { NextRequest } from "next/server";
import { withApi, ok, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { toggleFavoriteSchema } from "@/lib/api/schemas";
import { toggleFavorite } from "@/lib/core/favorites";

export const POST = withApi(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const { listingId } = await parseJson(req, toggleFavoriteSchema);
    const { favorite } = unwrap(await toggleFavorite(user, listingId));
    return ok({ favorite });
  },
  { auth: "bearer" },
);
