import type { NextRequest } from "next/server";
import { withApi, ok, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { listingStatusBodySchema } from "@/lib/api/schemas";
import { updateListingStatus } from "@/lib/core/listings";

export const PATCH = withApi<{ id: string }>(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const { id } = await ctx.params;
    const { status } = await parseJson(req, listingStatusBodySchema);
    unwrap(await updateListingStatus(user, id, status));
    return ok({ ok: true });
  },
  { auth: "bearer" },
);
