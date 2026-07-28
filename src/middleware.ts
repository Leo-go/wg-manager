import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { detectLocaleFromAcceptLanguage, isLocale } from "@/lib/i18n";
import { LOCALE_COOKIE } from "@/lib/i18n/types";

export async function middleware(request: NextRequest) {
  const response = await updateSession(request);
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");

  const existing = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!isApiRoute && !isLocale(existing)) {
    const locale = detectLocaleFromAcceptLanguage(
      request.headers.get("accept-language")
    );
    response.cookies.set(LOCALE_COOKIE, locale, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    });
  }

  return response;
}

export const config = {
  matcher: [
    "/login",
    "/dashboard/:path*",
    // Keep auth cookies fresh for setup API (uses user session, not service role)
    "/api/servers/:path*",
    "/api/vps/provision",
  ],
};
