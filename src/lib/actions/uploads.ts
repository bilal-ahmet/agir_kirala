"use server";

import { verifySession } from "../auth/session";
import * as core from "../core/uploads";
import { applyEffects } from "./wrap";
import type { MediaKind, UploadTicket } from "../core/uploads";

// İş mantığı src/lib/core/uploads.ts içinde (bilet üretimi, doğrulama, kayıt).

// UYARI: "use server" dosyalari YALNIZCA async fonksiyon export edebilir.
// Tip re-export'u (`export type { X }`) burada calisma aninda
// "ReferenceError: X is not defined" veriyor: derleyici modulu donusturuken
// tip-only isaretini kaybedip tanimsiz bir runtime bagi birakiyor. tsc ve
// `next build` bunu YAKALAMAZ; hata yalnizca action cagrildiginda ortaya cikar.
// Tipler kendi kaynak modullerinden import edilmeli.

/**
 * İmzalı yükleme bileti üretir. Foto biletleri hem orijinal (1600 px) hem küçük
 * boy (400 px) için ayrı hedef içerir — ikisi de WebP, format sunucu dayatması.
 */
export async function createUploadTicketAction(
  listingId: string,
  kind: MediaKind,
  contentType?: string,
  size?: number,
): Promise<{ ticket?: UploadTicket; error?: string }> {
  const user = await verifySession();
  const res = await core.createUploadTicket(user, listingId, kind, contentType, size);
  if (!res.ok) return { error: res.error.message };
  return { ticket: res.value };
}

/**
 * Yükleme bittikten sonra çağrılır: dosyaların Storage'da var olduğunu doğrular
 * ve DB'ye yazar. thumbPath opsiyoneldir — küçültme yapılamadıysa gönderilmez.
 */
export async function registerUploadedMediaAction(
  listingId: string,
  kind: MediaKind,
  path: string,
  thumbPath?: string,
): Promise<{ url?: string; error?: string }> {
  const user = await verifySession();
  const res = await core.registerUploadedMedia(user, listingId, kind, path, thumbPath);
  if (!res.ok) return { error: res.error.message };
  applyEffects(res);
  return { url: res.value.url };
}
