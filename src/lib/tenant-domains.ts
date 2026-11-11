/**
 * A business's own domain for its MarketFlow public pages (Pro plan and up; the domain is added on
 * the SSO Domains screen and auth-api checks the plan). The proxy asks auth-api's public
 * `/api/v1/domains/resolve` which tenant a host belongs to, serves "/" as that tenant's public
 * page, and passes the tenant on in a request header so the public pages refuse another tenant's
 * slug on this domain. Same pattern as ordering-frontend's lib/tenant-domains.ts. Pure helpers,
 * used by src/proxy.ts and the public pages.
 */

/** Request header carrying the tenant a custom domain belongs to. Set only by the proxy. */
export const DOMAIN_TENANT_HEADER = "x-mf-domain-tenant";

/** The request host without its port, lower case. */
export function normaliseHost(host: string | null | undefined): string {
  return (host ?? "").split(":")[0]!.trim().toLowerCase();
}

/** True for a host that may be a tenant's own domain: not the app's own host, not local. */
export function isTenantDomain(host: string, appHost: string): boolean {
  const h = normaliseHost(host);
  if (!h || h === normaliseHost(appHost)) return false;
  return h !== "localhost" && h !== "127.0.0.1" && !h.endsWith(".local");
}

/** Framework, API and static paths that are never rewritten. */
function isPassthrough(pathname: string): boolean {
  if (/^\/(_next|api|images|icons|brand|fonts)(\/|$)/.test(pathname)) return true;
  if (pathname === "/favicon.ico" || pathname === "/robots.txt" || pathname === "/healthz") return true;
  return /\.[a-z0-9]+$/i.test(pathname.split("/").pop() ?? "");
}

/**
 * Where a request on a tenant's domain is served from: "/" is the public page ("/p/{slug}") and
 * "/book" its booking page. Funnels (/f), short links (/s) and the other paths keep their address.
 * Returns null when nothing changes.
 */
export function tenantRewritePath(pathname: string, slug: string): string | null {
  if (isPassthrough(pathname)) return null;
  if (pathname === "/" || pathname === "") return `/p/${slug}`;
  if (pathname === "/book" || pathname === "/book/") return `/book/${slug}`;
  return null;
}

/**
 * Whether a public page for `slug` may be shown. On a tenant's domain (header set) only that
 * tenant's pages are; on the app's own host every tenant's are.
 */
export function domainAllows(domainTenant: string | null | undefined, slug: string): boolean {
  return !domainTenant || domainTenant === slug;
}

type CachedSlug = { slug: string | undefined; at: number };
const resolved = new Map<string, CachedSlug>();
const RESOLVE_TTL_MS = 60_000;

/**
 * The tenant slug for a host connected to MarketFlow on the SSO Domains screen. Cached for a minute
 * per host, misses included, so an unknown host costs at most one lookup a minute. Only domains
 * connected to MarketFlow count.
 */
export async function resolveTenantHost(host: string, authBase: string): Promise<string | undefined> {
  const h = normaliseHost(host);
  if (!h) return undefined;
  const hit = resolved.get(h);
  if (hit && Date.now() - hit.at < RESOLVE_TTL_MS) return hit.slug;
  let slug: string | undefined;
  try {
    const res = await fetch(`${authBase.replace(/\/+$/, "")}/api/v1/domains/resolve?host=${encodeURIComponent(h)}`, {
      signal: AbortSignal.timeout(3000),
    });
    if (res.ok) {
      // auth-api answers only for active domains and ones whose certificate is being issued.
      const body = (await res.json()) as { tenant_slug?: string; service?: string };
      if (body.service === "marketflow" && body.tenant_slug && /^[a-z0-9-]+$/i.test(body.tenant_slug)) {
        slug = body.tenant_slug;
      }
    }
  } catch {
    slug = undefined; // auth-api unreachable: serve the host as is and try again next minute
  }
  resolved.set(h, { slug, at: Date.now() });
  return slug;
}

/** Test hook: forget cached lookups. */
export function clearResolvedHosts(): void {
  resolved.clear();
}
