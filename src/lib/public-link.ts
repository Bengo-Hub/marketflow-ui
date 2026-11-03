import { safeUrl } from "@/components/public-profile/links";
import type { AuthTenantPublic } from "@/lib/api/public";
import { ORDERING_URL, publicProfileUrl } from "@/lib/urls";

export type PublicLinkKind = "profile" | "website" | "storefront";

export interface PublicLink {
  href: string;
  kind: PublicLinkKind;
  /** Button text, e.g. "Public page", "Website", "Storefront". */
  label: string;
}

/**
 * The one rule for where a tenant's public link goes (owner, 2026-11-03):
 * - Forever (FLP) tenants: their MarketFlow page, /p/{slug};
 * - everyone else: their own website when SSO has one, else their custom storefront domain,
 *   else the Codevertex storefront at ordering/{slug} when the tenant runs the ordering
 *   service, else no public link at all.
 */
export function resolvePublicLink(input: {
  slug: string;
  businessType?: string | null;
  auth?: AuthTenantPublic | null;
  /** Whether the tenant runs the ordering service. Undefined means not known: assume yes. */
  hasOrdering?: boolean;
}): PublicLink | null {
  const { slug, businessType, auth, hasOrdering } = input;
  if (!slug) return null;
  if (businessType === "flp") return { href: publicProfileUrl(slug), kind: "profile", label: "Public page" };
  const website = safeUrl(auth?.website);
  if (website && !website.startsWith("/")) return { href: website, kind: "website", label: "Website" };
  const domain = (auth?.storefront_domain ?? "").trim();
  if (domain && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(domain)) {
    return { href: `https://${domain}`, kind: "storefront", label: "Storefront" };
  }
  if (hasOrdering === false) return null;
  return { href: `${ORDERING_URL}/${encodeURIComponent(slug)}`, kind: "storefront", label: "Storefront" };
}
