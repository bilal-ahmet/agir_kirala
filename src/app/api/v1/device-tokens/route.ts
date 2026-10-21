import type { NextRequest } from "next/server";
import { withApi, currentSessionId, noContent, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { deviceTokenDeleteSchema, deviceTokenSchema } from "@/lib/api/schemas";
import { registerDeviceToken, removeDeviceToken } from "@/lib/core/devices";

/**
 * FCM cihaz token'ı. Flutter giriş sonrası ve her `onTokenRefresh`'te POST eder;
 * token isteği yapan oturuma bağlanır ve oturum kapanınca kendiliğinden silinir.
 */
export const POST = withApi(
  async (req: NextRequest, ctx) => {
    requireUser(ctx);
    const body = await parseJson(req, deviceTokenSchema);
    unwrap(await registerDeviceToken(await currentSessionId(), body));
    return noContent();
  },
  { auth: "bearer" },
);

export const DELETE = withApi(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const { token } = await parseJson(req, deviceTokenDeleteSchema);
    unwrap(await removeDeviceToken(user, token));
    return noContent();
  },
  { auth: "bearer" },
);
