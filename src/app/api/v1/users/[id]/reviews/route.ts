import type { NextRequest } from "next/server";
import { withApi, ok } from "@/lib/api/handler";
import { reviewsForUser } from "@/lib/db/queries/reviews";

export const GET = withApi<{ id: string }>(async (_req: NextRequest, ctx) => {
  const { id } = await ctx.params;
  return ok({ results: await reviewsForUser(id) });
});
