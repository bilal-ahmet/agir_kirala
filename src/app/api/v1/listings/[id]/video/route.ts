import type { NextRequest } from "next/server";
import { withApi, noContent, requireUser, unwrap } from "@/lib/api/handler";
import { deleteListingVideo } from "@/lib/core/uploads";

export const DELETE = withApi<{ id: string }>(
  async (_req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const { id } = await ctx.params;
    unwrap(await deleteListingVideo(user, id));
    return noContent();
  },
  { auth: "bearer" },
);
