import { withApi, ok, requireUser } from "@/lib/api/handler";
import { getBadges } from "@/lib/core/sessions";

/** Bekleyen talep + okunmamış sohbet sayıları (push gelene kadar polling ile). */
export const GET = withApi(
  async (_req, ctx) => ok(await getBadges(requireUser(ctx))),
  { auth: "session" },
);
