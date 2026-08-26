import "server-only";

import { NextResponse, type NextRequest } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { AppError, collectFieldErrors, httpStatus, pgCode, type MutationResult } from "../core/errors";
import { getCurrentUser, getSessionContext } from "../auth/session";
import type { User } from "../types";

/**
 * /api/v1 route handler altyapısı.
 *
 * Neden action'lar doğrudan sarılmıyor: server action'lar redirect() ve
 * revalidatePath() çağırıyor ve hatayı Türkçe string olarak dönüyor. Bir REST
 * ucunun bu bagajı taşıması gerekmez — route'lar core katmanını doğrudan çağırır
 * ve statüyü AppError.code'dan alır.
 */

export type ApiHandler<P> = (
  req: NextRequest,
  ctx: { params: Promise<P>; user: User | null },
) => Promise<Response>;

export interface ApiOptions {
  /**
   * "bearer"   — oturum ZORUNLU, yalnız Authorization başlığı (tüm mutasyonlar).
   * "session"  — oturum ZORUNLU, Bearer yoksa cookie'ye düşer (özel veri GET'leri).
   * "optional" — oturum İSTEĞE BAĞLI; varsa çözülür, yoksa handler anonim çalışır
   *              (görünürlüğü izleyene göre değişen halka açık GET'ler).
   * "none"     — oturum hiç aranmaz.
   */
  auth?: "bearer" | "session" | "optional" | "none";
}

function envelope(status: number, code: string, message: string, fieldErrors?: Record<string, string>) {
  return NextResponse.json({ error: { code, message, ...(fieldErrors ? { fieldErrors } : {}) } }, { status });
}

function isRedirectError(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "digest" in e &&
    typeof (e as { digest?: unknown }).digest === "string" &&
    (e as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export function withApi<P = Record<string, never>>(handler: ApiHandler<P>, options: ApiOptions = {}) {
  const mode = options.auth ?? "none";

  return async (req: NextRequest, ctx: { params: Promise<P> }): Promise<Response> => {
    try {
      let user: User | null = null;

      if (mode !== "none") {
        /**
         * CSRF: mutasyon uçlarında cookie fallback KAPALI.
         *
         * Server Action'larda Next'in yerleşik origin kontrolü kötü niyetli bir
         * siteden gelen form POST'unu engelliyor; düz route handler'da o koruma
         * yok. Cookie'yi mutasyonda kabul etseydik, kullanıcı oturumu açıkken
         * herhangi bir site onun adına favori/mesaj/talep üretebilirdi.
         * Mobil zaten Bearer kullanıyor, fallback'e ihtiyacı yok.
         */
        const hasBearer = /^Bearer\s+\S+$/i.test(req.headers.get("authorization") ?? "");
        if (mode === "bearer" && !hasBearer) {
          return envelope(401, "unauthorized", "Bu işlem için oturum açmanız gerekir.");
        }
        user = await getCurrentUser();
        // "optional" modunda oturumsuzluk normaldir: handler anonim ziyaretçiye
        // göre davranır (ör. ilan detayında yalnız aktif ilanı gösterir).
        if (!user && mode !== "optional") {
          return envelope(401, "unauthorized", "Bu işlem için oturum açmanız gerekir.");
        }
      }

      return await handler(req, { params: ctx.params, user });
    } catch (e) {
      if (e instanceof AppError) {
        return envelope(httpStatus[e.code], e.code, e.message, e.fieldErrors);
      }
      if (e instanceof z.ZodError) {
        return envelope(
          400,
          "validation",
          "Lütfen işaretli alanları düzeltin.",
          collectFieldErrors(e.issues),
        );
      }
      /**
       * Emniyet ağı: core'a taşınmamış bir yol verifySession() çağırıp
       * redirect() fırlatırsa, istemci 307 HTML yerine düzgün bir 401 alsın.
       */
      if (isRedirectError(e)) {
        return envelope(401, "unauthorized", "Bu işlem için oturum açmanız gerekir.");
      }
      /**
       * Bozuk UUID'li yol parametresi (ör. /requests/abc/status) Postgres'ten
       * 22P02 "invalid input syntax" olarak döner. Bunu 500 saymak yanlış:
       * istemcinin gönderdiği kimlik geçersizdir, yani böyle bir kaynak yoktur.
       * Gövde alanları zaten zod ile doğrulandığı için bu kod pratikte yalnız
       * yol parametrelerinden gelir.
       */
      if (pgCode(e) === "22P02") {
        return envelope(404, "not_found", "Kayıt bulunamadı.");
      }
      console.error("[api] beklenmeyen hata:", e);
      return envelope(500, "internal", "Beklenmeyen bir hata oluştu.");
    }
  };
}

/** Oturum zorunlu uçlarda kullanıcıyı çeker (withApi zaten doğruladı). */
export function requireUser(ctx: { user: User | null }): User {
  if (!ctx.user) throw new AppError("unauthorized", "Bu işlem için oturum açmanız gerekir.");
  return ctx.user;
}

/** Aktif oturumun token hash'i — şifre değiştirmede mevcut cihazı korumak için. */
export async function currentTokenHash(): Promise<string> {
  const { tokenHash } = await getSessionContext();
  if (!tokenHash) throw new AppError("unauthorized", "Bu işlem için oturum açmanız gerekir.");
  return tokenHash;
}

export function ok(data: unknown, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function noContent(): Response {
  return new Response(null, { status: 204 });
}

/** JSON gövdesini şemaya göre çözer; hatalar withApi'de zarfa dönüşür. */
export async function parseJson<S extends z.ZodType>(
  req: NextRequest,
  schema: S,
): Promise<z.output<S>> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    throw new AppError("validation", "Geçersiz JSON gövdesi.");
  }
  return schema.parse(raw);
}

/**
 * Core mutasyon sonucunu HTTP'ye çevirir ve web cache'ini tazeler.
 *
 * revalidatePath BURADA da çağrılır — yalnız server action'larda çağrılsaydı
 * mobilden eklenen bir ilan web'in /ilanlar sayfasında görünmezdi.
 */
export function unwrap<T>(result: MutationResult<T>): T {
  if (!result.ok) throw result.error;
  for (const path of result.revalidate) revalidatePath(path);
  return result.value;
}
