import type { NextRequest } from "next/server";
import { withApi, ok, requireUser, unwrap } from "@/lib/api/handler";
import { markConversationRead } from "@/lib/core/conversations";

/**
 * Okundu işaretleme istemci kontrolündedir (GET'in yan etkisi değil): kullanıcı
 * sohbeti gerçekten açtığında çağrılır, listede görünmesi yeterli sayılmaz.
 */
export const POST = withApi<{ id: string }>(
  async (_req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const { id } = await ctx.params;
    const res = unwrap(await markConversationRead(user, id));
    return ok(res);
  },
  { auth: "bearer" },
);
