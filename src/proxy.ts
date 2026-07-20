// Next.js 16: Middleware'in yeni adı "Proxy". Yalnızca optimistik cookie kontrolü —
// gerçek yetki her zaman DAL/action içinde getCurrentUser/verifySession ile yapılır.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE } from "./lib/auth/cookie";

export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has(SESSION_COOKIE);
  if (!hasSession) {
    const url = new URL("/giris", request.url);
    url.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/hesap/:path*"],
};
