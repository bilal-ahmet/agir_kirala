import "server-only";

import { createSign } from "node:crypto";
import { and, eq, gt, inArray } from "drizzle-orm";
import { db } from "../db";
import { deviceTokens, sessions } from "../db/schema";
import type { Notification } from "./types";

/**
 * FCM HTTP v1 push gönderimi.
 *
 * firebase-admin yerine doğrudan REST: ihtiyacımız iki çağrı (OAuth2 token +
 * messages:send) ve paket, soğuk başlangıca onlarca MB bağımlılık ekliyordu.
 * Service account JWT'si node:crypto ile imzalanır.
 *
 * ADRESLEME: cihaz token'ı. Flutter `POST /device-tokens` ile token'ı kaydeder;
 * token oturuma bağlıdır (bkz. schema.ts → device_tokens). Bir kullanıcının
 * birden fazla cihazı olabilir → her token'a ayrı istek (fan-out).
 *
 * ÖLÜ TOKEN: FCM `UNREGISTERED` (uygulama silindi / token yenilendi) veya
 * `SENDER_ID_MISMATCH` (başka Firebase projesinin token'ı) dönerse token
 * bir daha asla geçerli olmaz → silinir. Diğer hatalar yalnız loglanır.
 */

const SCOPE = "https://www.googleapis.com/auth/firebase.messaging";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const TIMEOUT_MS = 8000;
/** Erişim token'ı süresi dolmadan bu kadar önce yenilenir (saat kayması payı). */
const REFRESH_MARGIN_MS = 60_000;

interface FcmConfig {
  projectId: string;
  clientEmail: string;
  privateKey: string;
}

function config(): FcmConfig | null {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Vercel/.env tek satır tutar: PEM'deki satır sonları "\n" kaçışıyla gelir.
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

/** Yapılandırma var mı — testler ve teşhis için. */
export function isConfigured(): boolean {
  return config() !== null;
}

// ───────── OAuth2 erişim token'ı ─────────

/**
 * Sıcak lambda'da token ~1 saat yeniden kullanılır; her bildirimde Google'a
 * ikinci bir gidiş-dönüş eklemek gönderimi iki katı yavaşlatırdı. Eşzamanlı
 * gönderimler aynı yenileme isteğini paylaşır.
 */
let cached: { token: string; expiresAt: number } | null = null;
let inflight: Promise<string> | null = null;

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function signedJwt(cfg: FcmConfig): string {
  const now = Math.floor(Date.now() / 1000);
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(
    JSON.stringify({ iss: cfg.clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }),
  );
  const signature = createSign("RSA-SHA256").update(`${header}.${claims}`).sign(cfg.privateKey);
  return `${header}.${claims}.${base64url(signature)}`;
}

async function fetchAccessToken(cfg: FcmConfig): Promise<string> {
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: signedJwt(cfg),
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const payload = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!res.ok || !payload.access_token) {
    throw new Error(`OAuth2 token alınamadı (${res.status}): ${payload.error_description ?? "yanıt yok"}`);
  }
  cached = {
    token: payload.access_token,
    expiresAt: Date.now() + (payload.expires_in ?? 3600) * 1000 - REFRESH_MARGIN_MS,
  };
  return payload.access_token;
}

async function accessToken(cfg: FcmConfig): Promise<string> {
  if (cached && cached.expiresAt > Date.now()) return cached.token;
  inflight ??= fetchAccessToken(cfg).finally(() => {
    inflight = null;
  });
  return inflight;
}

// ───────── Gönderim ─────────

/** Bu FCM hata kodları token'ın kalıcı olarak geçersiz olduğunu söyler. */
const DEAD_TOKEN_CODES = new Set(["UNREGISTERED", "SENDER_ID_MISMATCH"]);

interface FcmErrorBody {
  error?: {
    status?: string;
    message?: string;
    details?: { "@type"?: string; errorCode?: string }[];
  };
}

/** FCM hata gövdesinden `errorCode`'u çıkarır (yoksa genel `status`). Saf — test edilir. */
export function fcmErrorCode(body: unknown): string | undefined {
  const err = (body as FcmErrorBody | null)?.error;
  const detail = err?.details?.find((d) => d["@type"]?.endsWith("google.firebase.fcm.v1.FcmError"));
  return detail?.errorCode ?? err?.status;
}

export function isDeadTokenError(body: unknown): boolean {
  const code = fcmErrorCode(body);
  return code !== undefined && DEAD_TOKEN_CODES.has(code);
}

/** FCM v1 mesaj gövdesi. Saf — test edilir. */
export function buildMessage(notification: Notification, token: string) {
  return {
    message: {
      token,
      notification: { title: notification.title, body: notification.body },
      // Derin bağlantı verisi. FCM data yalnız string taşır; tip zaten string'e kapalı.
      data: notification.data as unknown as Record<string, string>,
      // HIGH: Android'de Doze'da da hemen teslim (sohbet mesajı beklemez).
      android: { priority: "HIGH" as const, notification: { sound: "default" } },
      apns: { payload: { aps: { sound: "default" } } },
    },
  };
}

type SendOutcome = "sent" | "dead" | "failed";

async function sendOne(
  notification: Notification,
  token: string,
  cfg: FcmConfig,
  bearer: string,
): Promise<SendOutcome> {
  try {
    const res = await fetch(`https://fcm.googleapis.com/v1/projects/${cfg.projectId}/messages:send`, {
      method: "POST",
      headers: { authorization: `Bearer ${bearer}`, "content-type": "application/json" },
      body: JSON.stringify(buildMessage(notification, token)),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (res.ok) return "sent";

    const body = await res.json().catch(() => ({}));
    if (isDeadTokenError(body)) return "dead";

    // Erişim token'ı reddedildiyse (iptal edilmiş anahtar vb.) önbellek bir
    // sonraki gönderimde yenilensin.
    if (res.status === 401) cached = null;
    console.error("[notify] FCM reddetti:", res.status, JSON.stringify(body).slice(0, 300));
    return "failed";
  } catch (e) {
    // Bildirim gönderimi asla çağıranı etkilemez: mesaj/talep zaten kaydedildi.
    const reason = e instanceof Error && e.name === "TimeoutError" ? "zaman aşımı" : e;
    console.error("[notify] FCM gönderilemedi:", reason);
    return "failed";
  }
}

/** Alıcıların AKTİF oturumlarına bağlı token'lar — tek sorgu. */
async function tokensFor(userIds: string[]): Promise<Map<string, string[]>> {
  const rows = await db
    .select({ userId: sessions.userId, token: deviceTokens.token })
    .from(deviceTokens)
    .innerJoin(sessions, eq(deviceTokens.sessionId, sessions.id))
    .where(and(inArray(sessions.userId, userIds), gt(sessions.expiresAt, new Date())));

  const byUser = new Map<string, string[]>();
  for (const r of rows) {
    const list = byUser.get(r.userId);
    if (list) list.push(r.token);
    else byUser.set(r.userId, [r.token]);
  }
  return byUser;
}

/**
 * Bildirimleri gönderir. Yapılandırma yoksa sessizce hiçbir şey yapmaz —
 * geliştirme ortamında ve testlerde Firebase anahtarı bulunmaz.
 *
 * Hatalar yutulur ve loglanır: bildirim gidemedi diye mutasyon başarısız sayılmaz.
 */
export async function sendNotifications(notifications: Notification[]): Promise<void> {
  if (!notifications.length) return;

  const cfg = config();
  if (!cfg) {
    if (process.env.NODE_ENV === "production") {
      console.warn(
        `[notify] FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY tanımlı değil; ${notifications.length} bildirim gönderilmedi.`,
      );
    }
    return;
  }

  try {
    const byUser = await tokensFor([...new Set(notifications.map((n) => n.userId))]);
    // Alıcının kayıtlı cihazı yoksa (uygulamayı kurmamış / izin vermemiş) bu
    // bir hata değil; OAuth2 isteğini de boşuna yapmayalım.
    if (!byUser.size) return;

    const bearer = await accessToken(cfg);

    const jobs = notifications.flatMap((n) => {
      if (process.env.NOTIFY_DEBUG === "1") {
        // Gerçek cihazda "bildirim geldi ama yanlış ekrana gitti" hatasını
        // ayıklamanın en hızlı yolu bu satır.
        console.log(
          "[notify-debug]",
          JSON.stringify({ userId: n.userId, devices: byUser.get(n.userId)?.length ?? 0, title: n.title, data: n.data }),
        );
      }
      return (byUser.get(n.userId) ?? []).map(async (token) => ({
        token,
        outcome: await sendOne(n, token, cfg, bearer),
      }));
    });

    const results = await Promise.all(jobs);
    const dead = [...new Set(results.filter((r) => r.outcome === "dead").map((r) => r.token))];
    if (dead.length) await db.delete(deviceTokens).where(inArray(deviceTokens.token, dead));
  } catch (e) {
    console.error("[notify] FCM gönderimi başarısız:", e);
  }
}
