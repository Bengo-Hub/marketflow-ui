import { NextResponse, type NextRequest } from "next/server";
import { AB_COOKIE, AB_HEADER, newBucket, parseBucket } from "@/lib/funnel-ab";
import { DOMAIN_TENANT_HEADER, isTenantDomain, normaliseHost, resolveTenantHost, tenantRewritePath } from "@/lib/tenant-domains";
import { APP_URL, AUTH_API_URL } from "@/lib/urls";

const APP_HOST = new URL(APP_URL).host;

/**
 * Two jobs:
 * - A business's own domain (SSO Domains screen, Pro plan and up): "/" serves its public page,
 *   and the tenant goes to the pages in a header so they refuse any other tenant's slug there.
 * - Funnel A/B testing (Sprint 7 #53): each funnel visitor gets one stable bucket (0-99) in a
 *   cookie, handed to the page in a header so the first visit already renders the right version.
 */
export async function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  // Only this proxy may say which tenant a domain belongs to.
  headers.delete(DOMAIN_TENANT_HEADER);

  const host = normaliseHost(request.headers.get("x-forwarded-host") ?? request.headers.get("host"));
  let rewrite: URL | null = null;
  if (isTenantDomain(host, APP_HOST)) {
    const slug = await resolveTenantHost(host, AUTH_API_URL);
    if (slug) {
      headers.set(DOMAIN_TENANT_HEADER, slug);
      const target = tenantRewritePath(request.nextUrl.pathname, slug);
      if (target) {
        rewrite = request.nextUrl.clone();
        rewrite.pathname = target;
      }
    }
  }

  const isFunnel = request.nextUrl.pathname.startsWith("/f/");
  const existing = isFunnel ? parseBucket(request.cookies.get(AB_COOKIE)?.value) : null;
  if (isFunnel) headers.set(AB_HEADER, String(existing ?? newBucket()));

  const response = rewrite ? NextResponse.rewrite(rewrite, { request: { headers } }) : NextResponse.next({ request: { headers } });
  if (isFunnel && existing === null) {
    response.cookies.set(AB_COOKIE, headers.get(AB_HEADER)!, { path: "/f", maxAge: 60 * 60 * 24 * 90, sameSite: "lax", secure: true, httpOnly: true });
  }
  return response;
}

export const config = {
  // Skip Next internals and API routes up front; static files are filtered in tenantRewritePath.
  matcher: ["/((?!_next/|api/).*)"],
};
