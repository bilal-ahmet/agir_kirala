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
 * OneSignal `data` alanındaki her değeri STRING olarak taşır; Flutter tarafında
 * `int` beklemek çalışma anında patlar. Bu yüzden tipi baştan string'e kapattık.
 */
export interface NotificationData {
  type: NotificationKind;
  /** Açılacak ekranın kimliği: sohbet id'si, talep id'si veya ilan id'si. */
  id: string;
  listingId?: string;
}

export interface Notification {
  /** Alıcı — OneSignal'de External ID olarak bu kullanıcı id'si kullanılır. */
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
