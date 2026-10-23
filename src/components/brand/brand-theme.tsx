"use client";

import { useParams } from "next/navigation";
import type { ReactNode } from "react";
import { TenantBrandingProvider, useTenantBranding } from "@bengo-hub/shared-ui-lib/tenant";
import { DEFAULT_BRAND_COLOR, brandCss } from "@/lib/brand";

const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || "https://sso.codevertexafrica.com";

/**
 * The tenant's SSO branding (auth-api owns it) drives --primary and --ring for the whole app.
 * The provider's own CSS writer is off because it writes the light colour inline on <html>, which
 * also wins in dark mode; BrandStyle writes a light and a dark variant instead.
 */
export function BrandTheme({ children }: { children: ReactNode }) {
  const params = useParams<{ orgSlug?: string }>();
  const slug = typeof params?.orgSlug === "string" ? params.orgSlug : "";
  return (
    <TenantBrandingProvider
      slug={slug}
      authApiBase={AUTH_API_URL}
      defaultPrimaryColor={DEFAULT_BRAND_COLOR}
      defaultSecondaryColor="#6E6873"
      applyCssVariables={false}
    >
      <BrandStyle />
      {children}
    </TenantBrandingProvider>
  );
}

function BrandStyle() {
  const { tenant, slug } = useTenantBranding();
  // Platform pages and the landing page keep the stylesheet's Codevertex purple.
  if (!slug || !tenant?.primaryColor) return null;
  return <style id="tenant-brand">{brandCss(tenant.primaryColor)}</style>;
}
