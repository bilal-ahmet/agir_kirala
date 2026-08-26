import { withApi, ok } from "@/lib/api/handler";
import { buildOpenApiDocument } from "@/lib/api/openapi";

/** Koddan üretilir; şemalar değişince belge kendiliğinden güncel kalır. */
export const GET = withApi(async () => ok(buildOpenApiDocument()));
