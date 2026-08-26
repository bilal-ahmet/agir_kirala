import type { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import { withApi, noContent, parseJson, requireUser } from "@/lib/api/handler";
import { deviceTokenDeleteSchema, deviceTokenSchema } from "@/lib/api/schemas";
import { db } from "@/lib/db";
import { deviceTokens } from "@/lib/db/schema";

/**
 * Push bildirim ZEMİNİ. Gönderim (FCM/APNs) henüz yok — ayrı bir iş olarak
 * planlandı. Burası yalnızca Flutter'ın cihaz token'ını kaydedebilmesi için.
 *
 * Upsert hedefi `token`: aynı cihaz başka bir hesaba giriş yaparsa token sahibi
 * değişmeli, yoksa bildirim önceki kullanıcıya gitmeye devam ederdi.
 */
export const POST = withApi(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const body = await parseJson(req, deviceTokenSchema);

    await db
      .insert(deviceTokens)
      .values({ userId: user.id, token: body.token, platform: body.platform })
      .onConflictDoUpdate({
        target: deviceTokens.token,
        set: { userId: user.id, platform: body.platform, lastSeenAt: new Date() },
      });

    return noContent();
  },
  { auth: "bearer" },
);

export const DELETE = withApi(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const { token } = await parseJson(req, deviceTokenDeleteSchema);
    await db
      .delete(deviceTokens)
      .where(and(eq(deviceTokens.token, token), eq(deviceTokens.userId, user.id)));
    return noContent();
  },
  { auth: "bearer" },
);
