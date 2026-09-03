"use server";

import { verifySession } from "../auth/session";
import * as core from "../core/favorites";
import { applyEffects } from "./wrap";

/** Favori ekle/çıkar. Oturum yoksa /giris'e yönlendirir. Yeni durumu döner. */
export async function toggleFavoriteAction(listingId: string): Promise<{ favorite: boolean }> {
  const user = await verifySession();
  const res = await core.toggleFavorite(user, listingId);
  // toggleFavorite hata döndürmez (yoksa ekler, varsa siler) — sözleşme korunuyor.
  if (!res.ok) return { favorite: false };
  applyEffects(res);
  return { favorite: res.value.favorite };
}
