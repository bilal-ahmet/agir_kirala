import type { NextRequest } from "next/server";
import { withApi, ok, parseJson } from "@/lib/api/handler";
import { clientIp, enforceRateLimit } from "@/lib/api/rate-limit";
import { serializeUser } from "@/lib/api/serialize";
import { loginBodySchema } from "@/lib/api/schemas";
import { authenticate } from "@/lib/core/auth";
import { createMobileSession } from "@/lib/auth/session";

export const POST = withApi(async (req: NextRequest) => {
  const body = await parseJson(req, loginBodySchema);
  await enforceRateLimit("login", `${clientIp(req)}:${body.email.toLowerCase()}`);

  const res = await authenticate(body);
  if (!res.ok) throw res.error;

  const { token, expiresAt } = await createMobileSession(res.value.id, body.deviceName);
  return ok({
    token,
    expiresAt: expiresAt.toISOString(),
    user: serializeUser(res.value),
  });
});
