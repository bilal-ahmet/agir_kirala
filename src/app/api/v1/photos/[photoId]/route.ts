import type { NextRequest } from "next/server";
import { withApi, noContent, requireUser, unwrap } from "@/lib/api/handler";
import { deleteListingPhoto } from "@/lib/core/uploads";

/** Orijinal + küçük boy dosyaların İKİSİNİ birden siler. */
export const DELETE = withApi<{ photoId: string }>(
  async (_req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const { photoId } = await ctx.params;
    unwrap(await deleteListingPhoto(user, photoId));
    return noContent();
  },
  { auth: "bearer" },
);
