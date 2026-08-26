import { withApi, ok, requireUser } from "@/lib/api/handler";
import { serializeListing, serializeRequest } from "@/lib/api/serialize";
import { incomingRequests } from "@/lib/db/queries/requests";

export const GET = withApi(
  async (_req, ctx) => {
    const user = requireUser(ctx);
    const rows = await incomingRequests(user.id);
    return ok({
      results: rows.map((r) => ({
        request: serializeRequest(r.request),
        listing: r.listing ? serializeListing(r.listing) : null,
        counterpartName: r.counterpartName,
      })),
    });
  },
  { auth: "session" },
);
