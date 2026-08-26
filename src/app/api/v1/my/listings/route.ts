import { withApi, ok, requireUser } from "@/lib/api/handler";
import { serializeListing } from "@/lib/api/serialize";
import { myListings } from "@/lib/db/queries/listings";

/** Kullanıcının TÜM ilanları (taslak ve pasif dahil). */
export const GET = withApi(
  async (_req, ctx) => {
    const user = requireUser(ctx);
    const results = await myListings(user.id);
    return ok({ results: results.map(serializeListing) });
  },
  { auth: "session" },
);
