"use server";

import { headers } from "next/headers";
import { enforceRateLimit } from "../api/rate-limit";
import { parseVoiceQuery } from "../core/voice-search";

/**
 * Web sesli araması — /api/v1/search/parse ile aynı core.
 * Oturum gerekmez. Tipler `@/lib/core/voice-search`'ten import edilir
 * ("use server" dosyası tip export edemez, bkz. api/v1/README).
 */
export async function parseVoiceSearchAction(text: string) {
  const res = await parseVoiceQuery(
    { text },
    {
      beforeLlm: async () => {
        const h = await headers();
        const ip = h.get("x-forwarded-for")?.split(",")[0].trim() ?? h.get("x-real-ip") ?? "unknown";
        await enforceRateLimit("voice", ip);
      },
    },
  );
  if (!res.ok) return { error: res.error.message };
  return { result: res.value };
}
