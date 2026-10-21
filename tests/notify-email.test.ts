/**
 * Bildirim e-postası içerik testleri — veritabanı gerektirmez.
 *
 * E-postaya kullanıcının yazdığı metin (mesaj, isim, ilan başlığı) giriyor;
 * kaçışlanmazsa bir kullanıcı karşı tarafın gelen kutusuna HTML/bağlantı
 * enjekte edebilirdi. Bağlantılar web sayfalarına gitmeli, mobil yollara değil.
 */

import { describe, expect, it } from "vitest";
import { buildNotificationEmail } from "@/lib/notify/email";
import { notificationData, webPathFor, type NotificationKind } from "@/lib/notify/types";

const recipient = { email: "alici@example.test", name: "Ayşe" };
const BASE = "https://agirkirala.test";

function notif(type: NotificationKind, over: Partial<{ title: string; body: string }> = {}) {
  return {
    userId: "u1",
    title: over.title ?? "Başlık",
    body: over.body ?? "Gövde",
    data: notificationData(type, "id1", "ilan1"),
  };
}

describe("web bağlantıları", () => {
  it.each([
    ["message", "/hesap/mesajlar?c=id1"],
    ["request_created", "/hesap/gelen-talepler"],
    ["request_cancelled", "/hesap/gelen-talepler"],
    ["request_approved", "/hesap/taleplerim"],
    ["request_rejected", "/hesap/taleplerim"],
    ["review_created", "/ilanlar/ilan1"],
  ] as const)("%s → %s", (type, path) => {
    expect(webPathFor(notificationData(type, "id1", "ilan1"))).toBe(path);
    const mail = buildNotificationEmail(notif(type), recipient, BASE);
    expect(mail.html).toContain(`href="${BASE}${path}"`);
    expect(mail.text).toContain(`${BASE}${path}`);
  });
});

describe("içerik", () => {
  it("her türün kendi konusu var ve marka ekli", () => {
    const subjects = (["message", "request_created", "request_approved", "request_rejected", "request_cancelled", "review_created"] as const).map(
      (t) => buildNotificationEmail(notif(t, { title: "Mehmet" }), recipient, BASE).subject,
    );
    expect(new Set(subjects).size).toBe(6);
    expect(subjects[0]).toBe("Mehmet size mesaj gönderdi — AĞIRKİRALA");
    for (const s of subjects) expect(s.endsWith("— AĞIRKİRALA")).toBe(true);
  });

  it("alıcıya ve doğru adrese gider", () => {
    const mail = buildNotificationEmail(notif("request_approved"), recipient, BASE);
    expect(mail.to).toBe("alici@example.test");
    expect(mail.text).toContain("Merhaba Ayşe");
  });

  it("kullanıcı metni HTML'de kaçışlanır", () => {
    const mail = buildNotificationEmail(
      notif("message", { title: `<b>Ali</b>`, body: `<a href="http://kotu.test">tıkla</a> & "x"` }),
      { email: "a@b.test", name: "<img src=x onerror=alert(1)>" },
      BASE,
    );
    expect(mail.html).not.toContain("<b>Ali</b>");
    expect(mail.html).not.toContain('<a href="http://kotu.test">');
    expect(mail.html).not.toContain("<img");
    expect(mail.html).toContain("&lt;b&gt;Ali&lt;/b&gt;");
    expect(mail.html).toContain("&amp; &quot;x&quot;");
    // Düz metin sürümü olduğu gibi kalır (e-posta istemcisi HTML çalıştırmaz).
    expect(mail.text).toContain("<b>Ali</b>");
  });

  it("site adresi yoksa bağlantısız gönderilir", () => {
    const mail = buildNotificationEmail(notif("request_created"), recipient, null);
    expect(mail.html).not.toContain("href=");
    expect(mail.text).not.toContain("http");
  });
});
