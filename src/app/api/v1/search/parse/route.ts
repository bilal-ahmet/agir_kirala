import type { NextRequest } from "next/server";
import { withApi, ok, parseJson } from "@/lib/api/handler";
import { clientIp, enforceRateLimit } from "@/lib/api/rate-limit";
import { parseVoiceQuery, voiceQuerySchema } from "@/lib/core/voice-search";

/**
 * Sesli arama: cihazda metne çevrilmiş cümle → arama parametreleri.
 *
 * Oturum gerekmez (arama herkese açık). Dönen `params` olduğu gibi
 * GET /api/v1/listings sorgusuna eklenir.
 *
 * Hız sınırı yalnız LLM yedeğine girilecekse uygulanır: kural yolu bedavadır
 * ve DB'ye gitmez, sık aramaya ekstra round-trip eklenmez.
 */
export const POST = withApi(async (req: NextRequest) => {
  const body = await parseJson(req, voiceQuerySchema);
  const res = await parseVoiceQuery(body, {
    beforeLlm: () => enforceRateLimit("voice", clientIp(req)),
  });
  if (!res.ok) throw res.error;
  return ok(res.value);
});
