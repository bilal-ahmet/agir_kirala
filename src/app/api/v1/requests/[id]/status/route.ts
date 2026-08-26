import type { NextRequest } from "next/server";
import { withApi, ok, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { requestStatusBodySchema } from "@/lib/api/schemas";
import { updateRequestStatus } from "@/lib/core/requests";

/**
 * Talep durumu. Yetki core'da: onayla/reddet ilan sahibinin, iptal kiralayanın.
 * Not: düz GET /requests/[id] bilerek AÇILMADI — getRequest sahiplik kontrolü
 * yapmıyor, o uç yanlışlıkla herkese talep okuturdu.
 */
export const PATCH = withApi<{ id: string }>(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const { id } = await ctx.params;
    const { status } = await parseJson(req, requestStatusBodySchema);
    unwrap(await updateRequestStatus(user, id, status));
    return ok({ ok: true });
  },
  { auth: "bearer" },
);
