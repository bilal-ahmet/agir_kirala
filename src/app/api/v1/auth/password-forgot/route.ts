import type { NextRequest } from "next/server";
import { withApi, ok, parseJson } from "@/lib/api/handler";
import { enforceRateLimit } from "@/lib/api/rate-limit";
import { forgotSchema } from "@/lib/core/schemas";
import { sendPasswordResetFor } from "@/lib/core/auth";

/** Sıfırlama linki web sayfasını açar — mobil için de yeterli. */
function siteOrigin(req: NextRequest): string {
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL.replace(/\/$/, "");
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? "localhost:3000";
  const proto = req.headers.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const POST = withApi(async (req: NextRequest) => {
  const body = await parseJson(req, forgotSchema);
  await enforceRateLimit("forgot", body.email.toLowerCase());

  const res = await sendPasswordResetFor(body.email, siteOrigin(req));
  if (!res.ok) throw res.error;
  // Hesabın varlığından bağımsız aynı mesaj (enumeration sızdırmamak için).
  return ok(res.value);
});
