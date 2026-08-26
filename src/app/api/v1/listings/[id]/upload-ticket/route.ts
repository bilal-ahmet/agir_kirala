import type { NextRequest } from "next/server";
import { withApi, ok, parseJson, requireUser, unwrap } from "@/lib/api/handler";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { uploadTicketSchema } from "@/lib/api/schemas";
import { createUploadTicket } from "@/lib/core/uploads";

/**
 * İmzalı yükleme bileti. Foto için orijinal (1600 px) + küçük boy (400 px) olmak
 * üzere İKİ hedef döner; ikisi aynı UUID'yi paylaşır ve formatları .webp'dir
 * (sunucu dayatması). Flutter her hedefi
 * `storage.from(bucket).uploadToSignedUrl(path, token, file)` ile gönderir.
 *
 * Rate limit: imzalı URL üretimi bedava değil, sınırsız bilet üretilemez.
 */
export const POST = withApi<{ id: string }>(
  async (req: NextRequest, ctx) => {
    const user = requireUser(ctx);
    await enforceRateLimit("ticket", user.id);
    const { id } = await ctx.params;
    const body = await parseJson(req, uploadTicketSchema);
    const ticket = unwrap(
      await createUploadTicket(user, id, body.kind, body.contentType, body.size),
    );
    return ok(ticket);
  },
  { auth: "bearer" },
);
