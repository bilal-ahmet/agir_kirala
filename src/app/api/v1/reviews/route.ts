import type { NextRequest } from "next/server";
import { withApi, ok, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { createReviewSchema } from "@/lib/api/schemas";
import { createReview } from "@/lib/core/reviews";

export const POST = withApi(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const body = await parseJson(req, createReviewSchema);
    const { id } = unwrap(await createReview(user, body));
    return ok({ id }, 201);
  },
  { auth: "bearer" },
);
