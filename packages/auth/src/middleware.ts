import { NextRequest, NextResponse } from "next/server";

export interface AuthMiddlewareConfig {
  /** If not set, reads from process.env.SITE_PASSWORD */
  password?: string;
  /** Path to the auth page. Defaults to "/auth" */
  authPath?: string;
  /** Cookie name. Defaults to "site_password" */
  cookieName?: string;
  /** Cookie maxAge in seconds. Defaults to 1 year */
  maxAge?: number;
}

export function createAuthMiddleware(config: AuthMiddlewareConfig = {}) {
  const {
    authPath = "/auth",
    cookieName = "site_password",
    maxAge = 60 * 60 * 24 * 365,
  } = config;

  return function middleware(request: NextRequest) {
    const sitePassword = config.password ?? process.env.SITE_PASSWORD;
    if (!sitePassword) {
      return NextResponse.next();
    }

    const { pathname } = request.nextUrl;
    if (pathname === authPath) {
      return NextResponse.next();
    }

    // Check query param first — if valid, set cookie and redirect to strip it
    const provided = request.nextUrl.searchParams.get("password");
    if (provided === sitePassword) {
      const cleanUrl = new URL(request.url);
      cleanUrl.searchParams.delete("password");
      const response = NextResponse.redirect(cleanUrl);
      response.cookies.set(cookieName, provided, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge,
      });
      return response;
    }

    // Check cookie
    if (request.cookies.get(cookieName)?.value === sitePassword) {
      const response = NextResponse.next();
      // Re-set as httpOnly in case it was set client-side
      response.cookies.set(cookieName, sitePassword, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge,
      });
      return response;
    }

    const redirectUrl = new URL(authPath, request.url);
    redirectUrl.searchParams.set("next", pathname);
    if (provided !== null) redirectUrl.searchParams.set("wrong", "1");
    return NextResponse.redirect(redirectUrl);
  };
}
