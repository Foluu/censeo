import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Lightweight route guard: checks session cookie presence and redirects.
// Full JWT verification happens server-side in the (app) layout.
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (pathname === "/login") {
    if (hasSession) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  if (!hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

// PWA assets (service worker, manifest, offline page) must load without a
// session — browsers fetch them without cookies and a redirect breaks install.
export const config = {
  matcher: [
    "/((?!_next|favicon\\.ico|sw\\.js|manifest\\.webmanifest|offline\\.html|.*\\.(?:png|jpg|svg|ico|webp)).*)",
  ],
};
