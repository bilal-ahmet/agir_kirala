import type { NextRequest } from "next/server";
import { withApi, ok, parseJson } from "@/lib/api/handler";
import { clientIp, enforceRateLimit } from "@/lib/api/rate-limit";
import { serializeUser } from "@/lib/api/serialize";
import { registerBodySchema } from "@/lib/api/schemas";
import { registerUser } from "@/lib/core/auth";
import { createMobileSession } from "@/lib/auth/session";

export const POST = withApi(async (req: NextRequest) => {
  const body = await parseJson(req, registerBodySchema);
  await enforceRateLimit("register", clientIp(req));

  const res = await registerUser(body);
  if (!res.ok) throw res.error;

  const { token, expiresAt } = await createMobileSession(res.value.id, body.deviceName);
  return ok(
    { token, expiresAt: expiresAt.toISOString(), user: serializeUser(res.value) },
    201,
  );
});
