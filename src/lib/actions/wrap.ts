import "server-only";

import { revalidatePath } from "next/cache";
import { after } from "next/server";
import type { MutationResult } from "../core/errors";
import type { Notification } from "../notify/types";
import { sendNotifications } from "../notify/onesignal";

/**
 * Core mutasyon sonucunu taşıma katmanına bağlar.
 *
 * İş mantığı src/lib/core altında; action'lar yalnız oturumu çözer, core'u
 * çağırır ve sonucu web UI'ın beklediği `{ error?: string }` biçimine indirger.
 * Aynı core'u /api/v1 route handler'ları da (kendi HTTP statüsüyle) kullanır.
 */

export function applyRevalidation(paths: string[]): void {
  for (const p of paths) revalidatePath(p);
}

/**
 * Push bildirimlerini YANIT GÖNDERİLDİKTEN SONRA yollar.
 *
 * `after()` şart: Vercel'de yanıt döndükten sonra başlatılan "ateşle-unut" bir
 * iş, lambda dondurulduğu için hiç tamamlanmayabilir. Beklemek de yanlış olurdu —
 * mesaj zaten kaydedildi, kullanıcı OneSignal'in yavaşlığını beklememeli.
 *
 * Gönderim hataları yutulur (onesignal.ts içinde loglanır): bildirim
 * gidemedi diye mesaj gönderimi başarısız sayılmaz.
 */
export function dispatchNotifications(notifications: Notification[]): void {
  if (!notifications.length) return;
  after(() => sendNotifications(notifications));
}

/** Core sonucunu tek çağrıda uygular: cache tazeleme + bildirim. */
export function applyEffects(result: { revalidate: string[]; notify: Notification[] }): void {
  applyRevalidation(result.revalidate);
  dispatchNotifications(result.notify);
}

/** `{ error }` biçimine indirger — web UI mesajı olduğu gibi gösterir. */
export function toActionResult<T>(result: MutationResult<T>): { error?: string } & Partial<T> {
  if (!result.ok) return { error: result.error.message } as { error: string } & Partial<T>;
  applyEffects(result);
  return { ...(result.value as object) } as Partial<T>;
}
