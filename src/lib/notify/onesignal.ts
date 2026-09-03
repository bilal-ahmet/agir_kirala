import "server-only";

import type { Notification } from "./types";

/**
 * OneSignal push gönderimi.
 *
 * Neden doğrudan FCM değil: FCM HTTP v1 service account ile JWT imzalama, OAuth2
 * token değişimi/önbellekleme, kullanıcı başına çoklu cihaza fan-out ve ölü
 * token temizliği gerektiriyor. OneSignal bunların hepsini üstleniyor ve
 * gönderim geçmişi panelden görülebiliyor.
 *
 * ADRESLEME: External ID. Flutter tarafında oturum açılınca
 * `OneSignal.login(user.id)` çağrılır; backend cihaz token'ı SAKLAMAZ. Bu yüzden
 * device_tokens tablosu kaldırıldı — abonelikleri OneSignal yönetiyor.
 */

const ENDPOINT = "https://api.onesignal.com/notifications";
/** Tek istekte hedeflenebilecek External ID sayısı; pratikte hep 1 alıcımız var. */
const MAX_ALIASES = 100;
const TIMEOUT_MS = 8000;

interface OneSignalResponse {
  id?: string;
  errors?: unknown;
}

function config(): { appId: string; apiKey: string } | null {
  const appId = process.env.ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_API_KEY;
  if (!appId || !apiKey) return null;
  return { appId, apiKey };
}

/** Yapılandırma var mı — testler ve teşhis için. */
export function isConfigured(): boolean {
  return config() !== null;
}

async function send(notification: Notification, appId: string, apiKey: string): Promise<void> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        authorization: `Key ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        app_id: appId,
        target_channel: "push",
        include_aliases: { external_id: [notification.userId].slice(0, MAX_ALIASES) },
        headings: { en: notification.title },
        contents: { en: notification.body },
        // Derin bağlantı verisi. OneSignal string taşır; sayı göndermiyoruz.
        data: notification.data as unknown as Record<string, string>,
      }),
      signal: controller.signal,
    });

    const payload = (await res.json().catch(() => ({}))) as OneSignalResponse;

    if (!res.ok) {
      console.error("[notify] OneSignal reddetti:", res.status, JSON.stringify(payload).slice(0, 300));
      return;
    }

    /**
     * OneSignal, hedefin hiç aboneliği yoksa 200 döner ama `id` VERMEZ.
     * Bu bir hata değil: kullanıcı henüz uygulamayı kurmamış ya da bildirime
     * izin vermemiş olabilir. Gürültü yapmamak için sessizce geçiyoruz.
     */
    if (!payload.id) return;
  } catch (e) {
    // Bildirim gönderimi asla çağıranı etkilemez: mesaj/talep zaten kaydedildi.
    const reason = e instanceof Error && e.name === "AbortError" ? "zaman aşımı" : e;
    console.error("[notify] OneSignal gönderilemedi:", reason);
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Bildirimleri gönderir. Yapılandırma yoksa sessizce hiçbir şey yapmaz —
 * geliştirme ortamında ve testlerde OneSignal anahtarı bulunmaz.
 */
export async function sendNotifications(notifications: Notification[]): Promise<void> {
  if (!notifications.length) return;

  const cfg = config();
  if (!cfg) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[notify] ONESIGNAL_APP_ID/ONESIGNAL_API_KEY tanımlı değil; ${notifications.length} bildirim gönderilmedi.`,
      );
    }
    return;
  }

  await Promise.all(notifications.map((n) => send(n, cfg.appId, cfg.apiKey)));
}
