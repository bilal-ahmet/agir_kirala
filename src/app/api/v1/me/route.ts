import type { NextRequest } from "next/server";
import { withApi, ok, noContent, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { serializeUser } from "@/lib/api/serialize";
import { profileSchema } from "@/lib/api/schemas";
import { anonymizeAccount, updateProfile } from "@/lib/core/account";
import { getSessionContext } from "@/lib/auth/session";

export const GET = withApi(
  async () => {
    const { user, favoriteIds } = await getSessionContext();
    return ok({ user: serializeUser(user!), favoriteIds });
  },
  { auth: "session" },
);

export const PATCH = withApi(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const body = await parseJson(req, profileSchema);
    const { user: updated } = unwrap(await updateProfile(user, body));
    return ok({ user: serializeUser(updated) });
  },
  { auth: "bearer" },
);

/**
 * Hesap silme = ANONİMLEŞTİRME (App Store zorunluluğu).
 * Satır silinmez: kullanıcının yazdığı yorumlar cascade ile gitse karşı tarafın
 * puanı geriye dönük değişir, mesajları karşı tarafın sohbetinden kaybolurdu.
 * Kişisel veri temizlenir, giriş imkânsızlaşır, ilanlar yayından kalkar.
 */
export const DELETE = withApi(
  async (_req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    unwrap(await anonymizeAccount(user.id));
    return noContent();
  },
  { auth: "bearer" },
);
