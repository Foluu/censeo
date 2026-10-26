import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Clears the session and goes to /login. Used when a signed-in account has
// been deactivated or deleted: redirecting straight to /login would loop,
// because the proxy sends any cookie-holding request back to /dashboard.
export function GET(request: NextRequest) {
  const response = NextResponse.redirect(new URL("/login", request.url));
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
