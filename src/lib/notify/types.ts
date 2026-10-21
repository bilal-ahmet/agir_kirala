/**
 * Bildirim sözleşmesi — SAF modül (server-only YOK).
 *
 * core katmanı bunu import eder ama bildirimi GÖNDERMEZ: gönderim taşıma
 * katmanının işidir (`after()` gerektirir, o da next/server'a bağlıdır ve
 * testlerde istek bağlamı yoktur). `revalidate` ile aynı bölünme:
 * core KİME NE bildirileceğini söyler, taşıma NE ZAMAN/NASIL gönderileceğini bilir.
 */

export type NotificationKind =
  | "message"
  | "request_created"
  | "request_approved"
  | "request_rejected"
  | "request_cancelled"
  | "review_created";

/**
 * İstemcinin derin bağlantı için kullandığı veri.
 *
 * FCM `data` alanındaki her değeri STRING olarak taşır; Flutter tarafında
 * `int` beklemek çalışma anında patlar. Bu yüzden tipi baştan string'e kapattık.
 */
export interface NotificationData {
  type: NotificationKind;
  /** Açılacak ekranın kimliği: sohbet id'si, talep id'si veya ilan id'si. */
  id: string;
  listingId?: string;
  /**
   * Bildirime dokununca gidilecek UYGULAMA İÇİ yol.
   *
   * Mutlak URL yerine göreli yol gönderiliyor: URL, payload'ı üretim alan adına
   * bağlardı (alan adı değişince eski bildirimler kırılırdı) ve universal link
   * eşleşmesi eksikse uygulama yerine tarayıcı açılma riski taşırdı.
   *
   * İstemci tanımadığı bir yol görürse ana sayfaya düşmelidir — böylece yeni bir
   * bildirim türü eklendiğinde eski uygulama sürümleri bildirimi yutmaz.
   */
  route: string;
}

/**
 * Bildirim türü → uygulama içi yol.
 *
 * TEK eşleme tablosu. Flutter'ın router'ındaki adlar farklıysa değiştirilecek
 * yer burasıdır; başka hiçbir yerde yol dizesi üretilmez.
 */
export function routeFor(kind: NotificationKind, id: string, listingId?: string): string {
  switch (kind) {
    case "message":
      // id = sohbet id'si
      return `/mesajlar/${id}`;
    case "request_created":
    case "request_cancelled":
      // İlan sahibini ilgilendirir → gelen talepler
      return "/gelen-talepler";
    case "request_approved":
    case "request_rejected":
      // Kiralayanı ilgilendirir → kendi talepleri
      return "/taleplerim";
    case "review_created":
      return listingId ? `/ilanlar/${listingId}` : "/";
  }
}

/**
 * Bildirim verisini kurar — `route` otomatik türetilir.
 *
 * Çağrı yerlerinin `route`'u elle yazmasına izin verilmez: unutulan tek bir yer
 * bildirimi "dokununca hiçbir şey olmuyor" durumuna düşürürdü ve bu sessiz bir
 * hatadır.
 */
export function notificationData(
  type: NotificationKind,
  id: string,
  listingId?: string,
): NotificationData {
  return {
    type,
    id,
    ...(listingId ? { listingId } : {}),
    route: routeFor(type, id, listingId),
  };
}

export interface Notification {
  /** Alıcı — bu kullanıcının aktif oturumlarına bağlı tüm cihazlara gider. */
  userId: string;
  title: string;
  body: string;
  data: NotificationData;
}

/** Bildirim gövdesini tek satıra indirger ve kırpar (uzun mesajlar bildirimi taşırmasın). */
export function preview(text: string, max = 140): string {
  const oneLine = text.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine;
}
