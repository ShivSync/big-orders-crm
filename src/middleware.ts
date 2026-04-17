import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";
import { routing } from "./i18n/routing";
import { createServerClient } from "@supabase/ssr";

const intlMiddleware = createMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip auth check for login, reset-password, and public pages
  const isAuthRoute = routing.locales.some(
    (locale) =>
      pathname.startsWith(`/${locale}/login`) ||
      pathname.startsWith(`/${locale}/reset-password`) ||
      pathname === `/${locale}/book-party` ||
      pathname.startsWith(`/${locale}/book-party/`)
  );

  // Apply i18n middleware first
  const response = intlMiddleware(request);

  if (isAuthRoute) return response;

  // Check Supabase session for protected routes
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const locale =
      routing.locales.find((l) => pathname.startsWith(`/${l}`)) ||
      routing.defaultLocale;
    const loginUrl = new URL(`/${locale}/login`, request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
