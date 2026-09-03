/**
 * TİPLİ HATA SÖZLEŞMESİ
 *
 * Eskiden iş mantığı `{ error: "İlan bulunamadı veya yetkiniz yok." }` gibi Türkçe
 * string dönüyordu. Bir REST istemcisinin bundan 404 mü 403 mü çıkaracağını string
 * eşleştirerek bulması kırılgandır: mesajdaki bir kelime düzeltilince mobil akış
 * bozulur — ve mobil istemci mağazadan güncellenene kadar geri alınamaz.
 *
 * Bu yüzden statüyü `code` belirler. `message` yalnız insan içindir; hiçbir katman
 * mesaj metnine bakarak karar vermez.
 *
 * Saf modül: server-only YOK (test ve OpenAPI script'i de import eder).
 */

import type { Notification } from "../notify/types";

export type AppErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "validation"
  | "conflict"
  | "listing_not_active"
  | "self_action"
  | "already_exists"
  | "limit_exceeded"
  | "rate_limited"
  | "internal";

export class AppError extends Error {
  readonly code: AppErrorCode;
  /** Alan adı → Türkçe hata. Form doğrulamasında tüm alanlar birlikte döner. */
  readonly fieldErrors?: Record<string, string>;

  constructor(code: AppErrorCode, message: string, fieldErrors?: Record<string, string>) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.fieldErrors = fieldErrors;
  }
}

/** Kod → HTTP statü. Tek eşleme tablosu; route handler'lar buna bakar. */
export const httpStatus: Record<AppErrorCode, number> = {
  unauthorized: 401,
  forbidden: 403,
  not_found: 404,
  validation: 400,
  conflict: 409,
  // Aşağıdakiler de 400 ailesindedir; istemci bunları `code` ile ayırır,
  // statüyle değil (aynı statüde farklı akışlar tetiklenebilsin diye).
  listing_not_active: 400,
  self_action: 400,
  already_exists: 409,
  limit_exceeded: 400,
  rate_limited: 429,
  internal: 500,
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: AppError };

/**
 * Mutasyon sonucu — başarıda etkilenen web yollarını ve gönderilecek push
 * bildirimlerini de taşır.
 *
 * revalidatePath çağırmak taşıma katmanının işidir, ama HANGİ yolların bayatladığı
 * iş mantığının bilgisidir. Yol listesi burada tek kaynakta durur; hem server action
 * sarmalayıcısı hem de /api/v1 route handler'ı aynı listeyi uygular. Aksi halde
 * mobilden eklenen bir ilan web'de görünmezdi.
 */
export type MutationResult<T> =
  | { ok: true; value: T; revalidate: string[]; notify: Notification[] }
  | { ok: false; error: AppError };

export function ok<T>(value: T): Result<T> {
  return { ok: true, value };
}

export function mutated<T>(
  value: T,
  revalidate: string[] = [],
  notify: Notification[] = [],
): MutationResult<T> {
  return { ok: true, value, revalidate, notify };
}

export function fail(
  code: AppErrorCode,
  message: string,
  fieldErrors?: Record<string, string>,
): { ok: false; error: AppError } {
  return { ok: false, error: new AppError(code, message, fieldErrors) };
}

/** Zod hatalarının TAMAMINI alan bazında toplar (issues[0] değil). */
export function collectFieldErrors(issues: { path: PropertyKey[]; message: string }[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of issues) {
    const key = String(issue.path[0] ?? "_");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

/**
 * Postgres hatasını sarmalayıcıların içinden çıkarır.
 *
 * Drizzle, sürücü hatasını `DrizzleQueryError` içine `cause` olarak koyuyor;
 * doğrudan `e.code` bakmak bu yüzden hiçbir zaman eşleşmez ve beklenen bir
 * çakışma (ör. idempotency index'i) 500'e dönüşür. Zincir yukarı taranır.
 */
function pgError(e: unknown): { code?: string; constraint_name?: string } | undefined {
  let current = e;
  for (let depth = 0; depth < 5 && current; depth++) {
    if (typeof current === "object" && "code" in current) {
      const code = (current as { code?: unknown }).code;
      if (typeof code === "string") return current as { code: string; constraint_name?: string };
    }
    current = (current as { cause?: unknown }).cause;
  }
  return undefined;
}

/** Postgres SQLSTATE kodu (sarmalayıcıların içinden). */
export function pgCode(e: unknown): string | undefined {
  return pgError(e)?.code;
}

/** Unique ihlalinde (23505) ihlal edilen constraint adı. */
export function pgConstraint(e: unknown): string | undefined {
  const err = pgError(e);
  if (err?.code !== "23505") return undefined;
  return typeof err.constraint_name === "string" ? err.constraint_name : undefined;
}
