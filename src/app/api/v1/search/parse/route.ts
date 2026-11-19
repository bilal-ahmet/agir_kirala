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
 * Hız sınırı yalnız LLM'e gidilecekse uygulanır (varsayılan motorda her
 * cümle); aşılırsa kural motoruna düşülür. Kural yolu DB'ye hiç gitmez. Söylenen filtre sonuç çıkmıyor diye atılmaz; uygun
 * ilan yoksa istemci boş sonuç ekranını gösterir.
 */
export const POST = withApi(async (req: NextRequest) => {
  const body = await parseJson(req, voiceQuerySchema);
  const res = await parseVoiceQuery(body, {
    beforeLlm: () => enforceRateLimit("voice", clientIp(req)),
  });
  if (!res.ok) throw res.error;
  return ok(res.value);
});
