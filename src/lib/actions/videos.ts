"use server";

import { verifySession } from "../auth/session";
import * as core from "../core/uploads";
import { applyRevalidation } from "./wrap";

// Video YÜKLEME burada değil: dosya istemciden doğrudan Supabase'e gider
// (src/lib/core/uploads.ts + src/lib/upload-client.ts). Sebebi Vercel'deki
// 4.5 MB'lık sabit istek gövdesi sınırı.

/** İlan videosunu siler (Storage + DB). Yalnızca ilan sahibi. */
export async function deleteListingVideoAction(listingId: string): Promise<{ error?: string }> {
  const user = await verifySession();
  const res = await core.deleteListingVideo(user, listingId);
  if (!res.ok) return { error: res.error.message };
  applyRevalidation(res.revalidate);
  return {};
}
