"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Platform separation guard (see plan: platform-owner-self-tenant-separation).
 *
 * Model = "Dedicated Platform section": the platform owner manages their OWN business
 * by default (the root redirect sends them to `/{ownSlug}/dashboard`) and the
 * cross-tenant drill-in is confined to the platform area (`/platform/*` console +
 * the TenantSwitcher, which renders only on /platform).
 *
 * In marketflow the cross-tenant drill-in is URL-slug-based: the apiClient interceptor
 * (`src/lib/api/client.ts`) resolves `X-Tenant-Slug` from the first URL path segment,
 * falling back to `mf_preferred_slug` / `mf_tenant_slug` in localStorage only when no
 * usable URL slug is present. This effect re-pins that storage fallback to the owner's
 * OWN tenant whenever the route is NOT under `/platform`, so a drill-in selection can
 * never leak a foreign slug into the owner's own business pages via the storage
 * fallback. The TenantSwitcher (the selector) is itself confined to /platform in the
 * header.
 */
export function PlatformScopeGuard() {
  const pathname = usePathname() || "";

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (pathname.startsWith("/platform")) return;

    const ownSlug = localStorage.getItem("mf_tenant_slug");
    if (ownSlug && localStorage.getItem("mf_preferred_slug") !== ownSlug) {
      localStorage.setItem("mf_preferred_slug", ownSlug);
    }
  }, [pathname]);

  return null;
}
