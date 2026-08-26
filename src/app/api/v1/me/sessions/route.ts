import { withApi, currentTokenHash, ok, requireUser } from "@/lib/api/handler";
import { listSessions } from "@/lib/core/sessions";

/** "Cihazlarım" ekranı — 60 günlük token'lar için görünürlük şart. */
export const GET = withApi(
  async (_req, ctx) => {
    const user = requireUser(ctx);
    return ok({ results: await listSessions(user, await currentTokenHash()) });
  },
  { auth: "session" },
);
