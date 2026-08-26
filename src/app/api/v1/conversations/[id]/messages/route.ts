import type { NextRequest } from "next/server";
import { withApi, ok, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { sendMessageSchema } from "@/lib/api/schemas";
import { sendMessage } from "@/lib/core/conversations";

export const POST = withApi<{ id: string }>(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    await enforceRateLimit("msg", user.id);
    const { id } = await ctx.params;
    const { text } = await parseJson(req, sendMessageSchema);
    const { message } = unwrap(await sendMessage(user, id, text));
    return ok({ message }, 201);
  },
  { auth: "bearer" },
);
