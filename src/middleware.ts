import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const session = request.cookies.get("inrcliq_session");
  const { pathname } = request.nextUrl;

  if ((pathname.startsWith("/home") || pathname.startsWith("/onboarding")) && !session) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/home/:path*", "/onboarding/:path*"],
};
