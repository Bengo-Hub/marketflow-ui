"use client";

import { useQuery } from "@tanstack/react-query";
import { serviceTagsFromAccessToken } from "@bengo-hub/shared-ui-lib/app-switcher";
import { useTenantProfile } from "@/hooks/use-tenant-profile";
import { getAuthTenantPublic } from "@/lib/api/public";
import { resolvePublicLink, type PublicLink } from "@/lib/public-link";
import { useAuthStore } from "@/store/auth-store";

/** The signed-in tenant's public link (see resolvePublicLink), or null while unknown or when it has none. */
export function usePublicLink(slug: string | undefined): PublicLink | null {
  const session = useAuthStore((s) => s.session);
  const profile = useTenantProfile();
  const businessType = profile.data?.business_type;
  const auth = useQuery({
    queryKey: ["auth-tenant-public", slug],
    queryFn: () => getAuthTenantPublic(slug as string),
    enabled: !!slug && !!businessType && businessType !== "flp",
    staleTime: 10 * 60_000,
  });
  if (!slug || !businessType) return null;
  if (businessType !== "flp" && auth.isLoading) return null;
  const tags = serviceTagsFromAccessToken(session?.accessToken);
  return resolvePublicLink({
    slug,
    businessType,
    auth: auth.data,
    hasOrdering: tags && tags.length > 0 ? tags.includes("ordering") : undefined,
  });
}
