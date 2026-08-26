import type { NextRequest } from "next/server";
import { withApi, ok, requireUser } from "@/lib/api/handler";
import { AppError } from "@/lib/core/errors";
import { getConversation } from "@/lib/db/queries/conversations";

/** getConversation katılımcı kontrolünü kendi içinde yapar; yabancıya 404. */
export const GET = withApi<{ id: string }>(
  async (_req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const { id } = await ctx.params;
    const conversation = await getConversation(id, user.id);
    if (!conversation) throw new AppError("not_found", "Sohbet bulunamadı.");
    return ok({ conversation });
  },
  { auth: "session" },
);
