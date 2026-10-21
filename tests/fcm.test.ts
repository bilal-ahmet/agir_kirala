/**
 * FCM yük ve hata sınıflandırma testleri — veritabanı gerektirmez.
 *
 * Ölü token kararı yanlış verilirse iki sessiz hata olur: geçerli token silinir
 * (kullanıcı bildirim almayı keser, kimse fark etmez) ya da ölü token sonsuza
 * kadar her gönderimde log gürültüsü üretir.
 */

import { describe, expect, it } from "vitest";
import { buildMessage, fcmErrorCode, isDeadTokenError } from "@/lib/notify/fcm";
import { notificationData } from "@/lib/notify/types";

function fcmError(status: string, errorCode?: string) {
  return {
    error: {
      code: 404,
      message: "x",
      status,
      details: errorCode
        ? [{ "@type": "type.googleapis.com/google.firebase.fcm.v1.FcmError", errorCode }]
        : [],
    },
  };
}

describe("ölü token sınıflandırması", () => {
  it("UNREGISTERED ve SENDER_ID_MISMATCH ölü sayılır", () => {
    expect(isDeadTokenError(fcmError("NOT_FOUND", "UNREGISTERED"))).toBe(true);
    expect(isDeadTokenError(fcmError("PERMISSION_DENIED", "SENDER_ID_MISMATCH"))).toBe(true);
  });

  it("geçici hatalar token'ı SİLDİRMEZ", () => {
    expect(isDeadTokenError(fcmError("UNAVAILABLE", "UNAVAILABLE"))).toBe(false);
    expect(isDeadTokenError(fcmError("RESOURCE_EXHAUSTED", "QUOTA_EXCEEDED"))).toBe(false);
    expect(isDeadTokenError(fcmError("INTERNAL", "INTERNAL"))).toBe(false);
    // Yük hatası tüm token'ları silmemeli.
    expect(isDeadTokenError(fcmError("INVALID_ARGUMENT", "INVALID_ARGUMENT"))).toBe(false);
  });

  it("detay yoksa genel status'a düşer, bozuk gövde patlamaz", () => {
    expect(fcmErrorCode(fcmError("UNAUTHENTICATED"))).toBe("UNAUTHENTICATED");
    expect(isDeadTokenError({})).toBe(false);
    expect(isDeadTokenError(null)).toBe(false);
  });
});

describe("FCM mesaj gövdesi", () => {
  const notification = {
    userId: "u1",
    title: "Ahmet",
    body: "Merhaba",
    data: notificationData("message", "c1", "l1"),
  };

  it("token, başlık, gövde ve derin bağlantı verisini taşır", () => {
    const { message } = buildMessage(notification, "tok");
    expect(message.token).toBe("tok");
    expect(message.notification).toEqual({ title: "Ahmet", body: "Merhaba" });
    expect(message.data).toEqual({ type: "message", id: "c1", listingId: "l1", route: "/mesajlar/c1" });
  });

  it("data değerlerinin hepsi string (FCM sözleşmesi)", () => {
    for (const [key, v] of Object.entries(buildMessage(notification, "tok").message.data)) {
      expect(typeof v, `data.${key} string degil`).toBe("string");
    }
  });

  it("FCM'in ayırdığı data anahtarları kullanılmaz", () => {
    for (const key of Object.keys(buildMessage(notification, "tok").message.data)) {
      expect(["from", "notification", "message_type"]).not.toContain(key);
      expect(key.startsWith("google") || key.startsWith("gcm")).toBe(false);
    }
  });
});
