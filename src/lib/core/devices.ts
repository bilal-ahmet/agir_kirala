import "server-only";

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../db";
import { deviceTokens, sessions } from "../db/schema";
import type { User } from "../types";
import { mutated, type MutationResult } from "./errors";

/**
 * FCM cihaz token'ı kaydı.
 *
 * Token OTURUMA bağlanır (bkz. schema.ts → device_tokens): oturum kapanınca
 * cascade ile silinir, istemcinin çıkışta ayrıca DELETE çağırması gerekmez.
 *
 * TEK sorgu, iki iş:
 * - Upsert hedefi `token`: aynı cihaz başka bir hesaba giriş yaparsa token
 *   sahibi değişmeli, yoksa bildirim önceki kullanıcıya gitmeye devam ederdi.
 * - Aynı oturumun ESKİ token'ı silinir: FCM token'ı yenilendiğinde (onTokenRefresh)
 *   eski satır kalsaydı, geçersiz sayılana kadar cihaz bildirimi iki kez alabilirdi.
 *   Silinen satırlar `token <> yeni` olduğundan upsert ile çakışmaz.
 */
export async function registerDeviceToken(
  sessionId: string,
  input: { token: string; platform: "ios" | "android" },
): Promise<MutationResult<null>> {
  await db.execute(sql`
    with stale as (
      delete from ${deviceTokens}
      where session_id = ${sessionId} and token <> ${input.token}
    )
    insert into ${deviceTokens} (session_id, token, platform)
    values (${sessionId}, ${input.token}, ${input.platform})
    on conflict (token) do update
      set session_id = excluded.session_id,
          platform = excluded.platform,
          last_seen_at = now()
  `);
  return mutated(null);
}

/**
 * Token'ı siler — uygulama içinden "bildirimleri kapat" için. Yalnız kendi
 * oturumlarına bağlı token silinebilir; başkasının token'ını bilen biri onun
 * bildirimlerini kesemez.
 */
export async function removeDeviceToken(user: User, token: string): Promise<MutationResult<null>> {
  await db
    .delete(deviceTokens)
    .where(
      and(
        eq(deviceTokens.token, token),
        inArray(
          deviceTokens.sessionId,
          db.select({ id: sessions.id }).from(sessions).where(eq(sessions.userId, user.id)),
        ),
      ),
    );
  return mutated(null);
}
