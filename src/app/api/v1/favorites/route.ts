import { withApi, ok, requireUser } from "@/lib/api/handler";
import { serializeListing } from "@/lib/api/serialize";
import { favoriteListings } from "@/lib/db/queries/favorites";

export const GET = withApi(
  async (_req, ctx) => {
    const user = requireUser(ctx);
    const results = await favoriteListings(user.id);
    return ok({ results: results.map(serializeListing) });
  },
  { auth: "session" },
);
