import type { NextRequest } from "next/server";
import { withApi, ok, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { startConversationSchema } from "@/lib/api/schemas";
import { startConversation } from "@/lib/core/conversations";
import { conversationViewsFor } from "@/lib/db/queries/conversations";

export const GET = withApi(
  async (_req, ctx) => {
    const user = requireUser(ctx);
    return ok({ results: await conversationViewsFor(user.id) });
  },
  { auth: "session" },
);

export const POST = withApi(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    await enforceRateLimit("msg", user.id);
    const { listingId, text } = await parseJson(req, startConversationSchema);
    const res = unwrap(await startConversation(user, listingId, text));
    return ok(res, 201);
  },
  { auth: "bearer" },
);
