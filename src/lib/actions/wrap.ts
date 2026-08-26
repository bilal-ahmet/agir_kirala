import "server-only";

import { revalidatePath } from "next/cache";
import type { MutationResult } from "../core/errors";

/**
 * Core mutasyon sonucunu server action sözleşmesine çevirir.
 *
 * İş mantığı artık src/lib/core altında; action'lar yalnız oturumu çözer, core'u
 * çağırır ve sonucu web UI'ın beklediği `{ error?: string }` biçimine indirger.
 * Böylece aynı mantığı /api/v1 route handler'ları da (kendi HTTP statüsüyle)
 * kullanabiliyor, iki kopya kural oluşmuyor.
 *
 * revalidatePath çağırmak taşıma katmanının işidir; HANGİ yolların bayatladığı
 * bilgisi core'dan gelir (MutationResult.revalidate).
 */
export function applyRevalidation(paths: string[]): void {
  for (const p of paths) revalidatePath(p);
}

/** `{ error }` biçimine indirger — web UI mesajı olduğu gibi gösterir. */
export function toActionResult<T>(result: MutationResult<T>): { error?: string } & Partial<T> {
  if (!result.ok) return { error: result.error.message } as { error: string } & Partial<T>;
  applyRevalidation(result.revalidate);
  return { ...(result.value as object) } as Partial<T>;
}
