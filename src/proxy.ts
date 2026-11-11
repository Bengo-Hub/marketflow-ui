import { NextResponse, type NextRequest } from "next/server";
import { AB_COOKIE, AB_HEADER, newBucket, parseBucket } from "@/lib/funnel-ab";

/**
 * Funnel A/B testing (Sprint 7 #53): gives each funnel visitor one stable bucket (0-99) in a
 * cookie and hands it to the page in a request header, so the first visit already renders the
 * right version.
 */
export function proxy(request: NextRequest) {
  const existing = parseBucket(request.cookies.get(AB_COOKIE)?.value);
  const bucket = existing ?? newBucket();
  const headers = new Headers(request.headers);
  headers.set(AB_HEADER, String(bucket));
  const response = NextResponse.next({ request: { headers } });
  if (existing === null) {
    response.cookies.set(AB_COOKIE, String(bucket), { path: "/f", maxAge: 60 * 60 * 24 * 90, sameSite: "lax", secure: true, httpOnly: true });
  }
  return response;
}

export const config = {
  matcher: "/f/:path*",
};
