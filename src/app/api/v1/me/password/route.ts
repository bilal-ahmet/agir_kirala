import type { NextRequest } from "next/server";
import { withApi, currentTokenHash, ok, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { changePasswordSchema } from "@/lib/api/schemas";
import { changePassword } from "@/lib/core/account";

/**
 * Oturum içi şifre değiştirme. Mevcut cihaz AYAKTA kalır, diğer oturumlar düşer.
 * (E-posta ile sıfırlama tüm oturumları siler — orası olası bir ele geçirme
 * senaryosu, burası kullanıcının bilinçli eylemi.)
 */
export const POST = withApi(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    const body = await parseJson(req, changePasswordSchema);
    const tokenHash = await currentTokenHash();
    const res = unwrap(await changePassword(user, body, tokenHash));
    return ok({ ok: true, closedSessions: res.closedSessions });
  },
  { auth: "bearer" },
);
