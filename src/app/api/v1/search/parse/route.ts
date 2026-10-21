import type { NextRequest } from "next/server";
import { withApi, ok, parseJson } from "@/lib/api/handler";
import { clientIp, enforceRateLimit } from "@/lib/api/rate-limit";
import { parseVoiceQuery, voiceQuerySchema } from "@/lib/core/voice-search";
import { listingsExist } from "@/lib/db/queries/listings";
import { parseFilters } from "@/lib/filter-params";

/**
 * Sesli arama: cihazda metne çevrilmiş cümle → arama parametreleri.
 *
 * Oturum gerekmez (arama herkese açık). Dönen `params` olduğu gibi
 * GET /api/v1/listings sorgusuna eklenir.
 *
 * Hız sınırı yalnız LLM yedeğine girilecekse uygulanır: kural yolu bedavadır.
 * Kural yolu DB'ye yalnız güvenlik ağı için gider (filtrelerin yanında serbest
 * kelime kaldıysa, o kelime sonucu sıfırlıyor mu diye tek satırlık bir sorgu).
 */
export const POST = withApi(async (req: NextRequest) => {
  const body = await parseJson(req, voiceQuerySchema);
  const res = await parseVoiceQuery(body, {
    beforeLlm: () => enforceRateLimit("voice", clientIp(req)),
    hasResults: (params) => listingsExist(parseFilters(params)),
  });
  if (!res.ok) throw res.error;
  return ok(res.value);
});
