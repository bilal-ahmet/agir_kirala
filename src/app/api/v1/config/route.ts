import { withApi, ok } from "@/lib/api/handler";
import { getAppConfig } from "@/lib/api/config";

/** Zorunlu güncelleme + bakım modu — eski istemciyi uzaktan kapatabilmek için. */
export const GET = withApi(async () => ok(getAppConfig()));
