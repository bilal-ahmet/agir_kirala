import type { NextRequest } from "next/server";
import { withApi, ok, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { registerMediaSchema } from "@/lib/api/schemas";
import { registerUploadedMedia } from "@/lib/core/uploads";

/**
 * Yükleme tamamlandıktan sonra kayıt. thumbPath opsiyoneldir: küçültmeyi
 * yapamayan istemci göndermez, o satır thumbUrl=null kalır ve serializer
 * orijinale düşer — ilan yüklemesi bu yüzden ölmez.
 */
export const POST = withApi<{ id: string }>(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const { id } = await ctx.params;
    const body = await parseJson(req, registerMediaSchema);
    const res = unwrap(
      await registerUploadedMedia(user, id, body.kind, body.path, body.thumbPath),
    );
    return ok(res, 201);
  },
  { auth: "bearer" },
);
