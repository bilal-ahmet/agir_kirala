import type { NextRequest } from "next/server";
import { withApi, ok, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { createRentalRequestSchema } from "@/lib/api/schemas";
import { createRentalRequest } from "@/lib/core/requests";

/**
 * Kiralama talebi. Aynı gövde iki kez gelirse (mobilde çift dokunma / timeout
 * retry) kısmi unique index devreye girer ve ikinci istek 409 `conflict` alır.
 */
export const POST = withApi(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    await enforceRateLimit("req", user.id);
    const body = await parseJson(req, createRentalRequestSchema);
    const { id } = unwrap(await createRentalRequest(user, body));
    return ok({ id }, 201);
  },
  { auth: "bearer" },
);
