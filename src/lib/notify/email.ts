import "server-only";

import { inArray } from "drizzle-orm";
import { tryRateLimit } from "../api/rate-limit";
import { db } from "../db";
import { users } from "../db/schema";
import { emailConfigured, escapeHtml, sendEmail, type EmailMessage } from "../email";
import { webPathFor, type Notification, type NotificationKind } from "./types";

/**
 * Bildirim e-postası — web kullanıcılarının push karşılığı.
 *
 * Push ile AYNI bildirim nesnesinden üretilir (core'un MutationResult.notify'ı):
 * yeni tetikleyici eklemek için burada bir şey yapmak gerekmez, yalnız aşağıdaki
 * metin tablosuna türün satırı eklenir (tip denetimi unutulmasını engeller).
 *
 * Mesaj e-postası alıcı + sohbet başına 5 dakikada bire sınırlı (LIMITS.mailMsg):
 * canlı bir yazışmada her mesaj için e-posta gelen kutusunu doldururdu. Talep ve
 * değerlendirme e-postaları seyrek ve her biri ayrı bir olay; sınır yok.
 */

const BRAND = "AĞIRKİRALA";

const COPY: Record<NotificationKind, { subject: (n: Notification) => string; heading: string; cta: string }> = {
  message: { subject: (n) => `${n.title} size mesaj gönderdi`, heading: "Yeni mesajınız var", cta: "Mesajı görüntüle" },
  request_created: { subject: () => "Yeni kiralama talebi", heading: "Yeni kiralama talebi", cta: "Talebi görüntüle" },
  request_approved: { subject: () => "Kiralama talebiniz onaylandı", heading: "Talebiniz onaylandı", cta: "Talebimi görüntüle" },
  request_rejected: { subject: () => "Kiralama talebiniz reddedildi", heading: "Talebiniz reddedildi", cta: "Taleplerimi görüntüle" },
  request_cancelled: { subject: () => "Bir kiralama talebi iptal edildi", heading: "Talep iptal edildi", cta: "Gelen talepleri görüntüle" },
  review_created: { subject: () => "İlanınıza yeni değerlendirme", heading: "Yeni değerlendirme", cta: "Değerlendirmeyi görüntüle" },
};

/** E-postadaki bağlantıların kökü. Yoksa (yerel geliştirme) bağlantısız gönderilir. */
export function siteUrl(): string | null {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  if (explicit) return explicit.replace(/\/$/, "");
  // Vercel'in kendi tanımladığı üretim alan adı (ayar gerektirmez).
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  return vercel ? `https://${vercel}` : null;
}

/** Bildirim → e-posta. Saf: test edilir. */
export function buildNotificationEmail(
  n: Notification,
  recipient: { email: string; name: string },
  baseUrl: string | null,
): EmailMessage {
  const copy = COPY[n.data.type];
  const url = baseUrl ? `${baseUrl}${webPathFor(n.data)}` : null;
  // Mesajda başlık gönderenin adı, gövde mesajın önizlemesi; diğerlerinde
  // başlık olayın kendisi ("Talebiniz onaylandı"), gövde ilan/kişi özeti.
  const detail = n.data.type === "message" ? `${n.title}: “${n.body}”` : n.body;

  const text = [
    `Merhaba ${recipient.name},`,
    "",
    copy.heading,
    detail,
    ...(url ? ["", `${copy.cta}: ${url}`] : []),
    "",
    `Bu e-postayı ${BRAND} hesabınızdaki bir etkinlik nedeniyle aldınız.`,
  ].join("\n");

  const html = `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#18181b">
        <p style="margin:0 0 16px;color:#52525b">Merhaba ${escapeHtml(recipient.name)},</p>
        <h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(copy.heading)}</h1>
        <p style="margin:0 0 12px;line-height:1.6;white-space:pre-line">${escapeHtml(detail)}</p>
        ${
          url
            ? `<p style="margin:24px 0">
          <a href="${escapeHtml(url)}" style="display:inline-block;background:#f5b100;color:#1a1400;font-weight:700;text-decoration:none;padding:12px 20px;border-radius:8px">
            ${escapeHtml(copy.cta)}
          </a>
        </p>`
            : ""
        }
        <p style="margin:16px 0 0;font-size:13px;color:#8a8a93;line-height:1.6">
          Bu e-postayı ${BRAND} hesabınızdaki bir etkinlik nedeniyle aldınız.
        </p>
      </div>
    `;

  return { to: recipient.email, subject: `${copy.subject(n)} — ${BRAND}`, text, html };
}

export interface EmailDeps {
  send: (msg: EmailMessage) => Promise<void>;
  /** Mesaj e-postası bu alıcı + sohbet için şimdi gönderilebilir mi (sayacı da artırır). */
  allowMessage: (userId: string, conversationId: string) => Promise<boolean>;
}

const defaultDeps: EmailDeps = {
  send: sendEmail,
  allowMessage: (userId, conversationId) => tryRateLimit("mailMsg", `${userId}:${conversationId}`),
};

/**
 * Bildirimleri e-postayla gönderir. Hatalar yutulur ve loglanır: e-posta
 * gidemedi diye mesaj/talep başarısız sayılmaz (push ile aynı sözleşme).
 * Yapılandırma yoksa (yerel/CI) sessizce atlanır.
 */
export async function sendNotificationEmails(
  notifications: Notification[],
  deps: EmailDeps = defaultDeps,
): Promise<void> {
  if (!notifications.length) return;
  if (deps === defaultDeps && !emailConfigured()) {
    if (process.env.NODE_ENV === "production") {
      console.warn(`[notify] RESEND_API_KEY/EMAIL_FROM tanımlı değil; ${notifications.length} e-posta gönderilmedi.`);
    }
    return;
  }

  try {
    const ids = [...new Set(notifications.map((n) => n.userId))];
    const rows = await db
      .select({ id: users.id, email: users.email, name: users.name, deletedAt: users.deletedAt })
      .from(users)
      .where(inArray(users.id, ids));
    const byId = new Map(rows.map((r) => [r.id, r]));
    const base = siteUrl();

    await Promise.all(
      notifications.map(async (n) => {
        const r = byId.get(n.userId);
        // Silinmiş (anonimleştirilmiş) hesabın e-postası tombstone'dur.
        if (!r || r.deletedAt) return;
        if (n.data.type === "message" && !(await deps.allowMessage(n.userId, n.data.id))) return;
        try {
          await deps.send(buildNotificationEmail(n, r, base));
        } catch (e) {
          console.error("[notify] e-posta gönderilemedi:", n.data.type, e instanceof Error ? e.message : e);
        }
      }),
    );
  } catch (e) {
    console.error("[notify] e-posta bildirimi başarısız:", e);
  }
}
