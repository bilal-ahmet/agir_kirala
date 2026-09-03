"use server";

import { verifySession } from "../auth/session";
import * as core from "../core/uploads";
import { applyEffects } from "./wrap";

// Görsel YÜKLEME burada değil: dosyalar istemciden doğrudan Supabase'e gider
// (src/lib/core/uploads.ts + src/lib/upload-client.ts). Sebebi Vercel Serverless
// Function'lardaki 4.5 MB'lık sabit istek gövdesi sınırı.

/** İlan görselini siler (Storage'daki orijinal + küçük boy, sonra DB). Yalnızca ilan sahibi. */
export async function deleteListingPhotoAction(photoId: string): Promise<{ error?: string }> {
  const user = await verifySession();
  const res = await core.deleteListingPhoto(user, photoId);
  if (!res.ok) return { error: res.error.message };
  applyEffects(res);
  return {};
}
