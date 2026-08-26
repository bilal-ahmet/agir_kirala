import type { NextRequest } from "next/server";
import { withApi, noContent } from "@/lib/api/handler";
import { destroyBearerSession } from "@/lib/auth/session";

export const POST = withApi(
  async (req: NextRequest) => {
    const token = req.headers.get("authorization")?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (token) await destroyBearerSession(token);
    return noContent();
  },
  { auth: "bearer" },
);
