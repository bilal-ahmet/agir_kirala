import type { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { withApi, ok } from "@/lib/api/handler";
import { db } from "@/lib/db";

/**
 * Sağlık kontrolü. Varsayılan hâli DB'ye DOKUNMAZ: cold start'ta pooler'ı
 * bekletmek, sırf "ayakta mı" sorusuna cevap vermek için pahalıdır.
 * Gerçekten veritabanını yoklamak isteyen `?deep=1` ile çağırır.
 */
export const GET = withApi(async (req: NextRequest) => {
  if (req.nextUrl.searchParams.get("deep") !== "1") return ok({ ok: true });

  try {
    await db.execute(sql`select 1`);
    return ok({ ok: true, db: "up" });
  } catch {
    return ok({ ok: false, db: "down" }, 503);
  }
});
