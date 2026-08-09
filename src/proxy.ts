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
  matcher: [
    {
      source: "/hesap/:path*",
      /**
       * Server Action POST'ları proxy'den MUAF.
       *
       * Next 16, proxy ile eşleşen isteklerin gövdesini belleğe klonlar
       * (experimental.proxyClientMaxBodySize, varsayılan 10MB). 10MB'ı aşan
       * video yüklemesinde gövde kırpılıyor, multipart ayrıştırma
       * "Unexpected end of form" ile patlıyor ve ilan-ekle 500 dönüyordu.
       *
       * Güvenlik kaybı yok: proxy yalnızca optimistik yönlendirme yapar;
       * gerçek yetki her server action içinde verifySession() ile doğrulanır.
       */
      missing: [{ type: "header", key: "next-action" }],
    },
  ],
};
