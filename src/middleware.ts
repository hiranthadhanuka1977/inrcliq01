import { NextRequest, NextResponse } from "next/server";
import { SETTINGS_ACCESS_COOKIE } from "@/lib/settings/access";

/** Demo gate credentials — override with BASIC_AUTH_USER / BASIC_AUTH_PASSWORD on Vercel. */
const DEFAULT_USER = "demo@inrcliq.com";
const DEFAULT_PASSWORD = "demo@inrcliq.com";

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="InrCliq Demo", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

function isBasicAuthEnabled() {
  const flag = process.env.BASIC_AUTH_ENABLED?.trim().toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  // Auto-enable on Vercel so the demo is gated even if env vars were not added yet.
  return process.env.VERCEL === "1";
}

function getCredentials() {
  return {
    user: process.env.BASIC_AUTH_USER?.trim() || DEFAULT_USER,
    password:
      process.env.BASIC_AUTH_PASSWORD !== undefined && process.env.BASIC_AUTH_PASSWORD !== ""
        ? process.env.BASIC_AUTH_PASSWORD
        : DEFAULT_PASSWORD,
  };
}

function isBasicAuthValid(request: NextRequest) {
  if (!isBasicAuthEnabled()) {
    return true;
  }

  const { user, password } = getCredentials();
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Basic ")) {
    return false;
  }

  try {
    const decoded = atob(header.slice(6));
    const separator = decoded.indexOf(":");
    if (separator < 0) return false;

    const providedUser = decoded.slice(0, separator);
    const providedPassword = decoded.slice(separator + 1);
    return providedUser === user && providedPassword === password;
  } catch {
    return false;
  }
}

function hasSettingsAccess(request: NextRequest) {
  return request.cookies.get(SETTINGS_ACCESS_COOKIE)?.value === "1";
}

function isSettingsUnlockPath(pathname: string) {
  return pathname === "/settings/unlock" || pathname === "/api/settings/unlock";
}

function isSettingsPath(pathname: string) {
  return pathname.startsWith("/settings") || pathname.startsWith("/api/settings");
}

export function middleware(request: NextRequest) {
  if (!isBasicAuthValid(request)) {
    return unauthorized();
  }

  const session = request.cookies.get("inrcliq_session");
  const { pathname } = request.nextUrl;

  if ((pathname.startsWith("/home") || pathname.startsWith("/feed") || pathname.startsWith("/onboarding")) && !session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (isSettingsPath(pathname) && !isSettingsUnlockPath(pathname) && !hasSettingsAccess(request)) {
    if (pathname.startsWith("/api/settings")) {
      return NextResponse.json({ error: "Settings access required." }, { status: 401 });
    }

    const unlockUrl = new URL("/settings/unlock", request.url);
    unlockUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(unlockUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Protect all routes except Next.js internals and common static assets.
     * Basic Auth still applies to pages and API routes.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
