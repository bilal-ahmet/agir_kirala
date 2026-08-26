import { withApi, noContent, requireUser, unwrap } from "@/lib/api/handler";
import { revokeSession } from "@/lib/core/sessions";

/** Uzaktan oturum kapatma (kaybolan cihaz vb.). */
export const DELETE = withApi<{ id: string }>(
  async (_req, ctx) => {
    const user = requireUser(ctx);
    const { id } = await ctx.params;
    unwrap(await revokeSession(user, id));
    return noContent();
  },
  { auth: "bearer" },
);
