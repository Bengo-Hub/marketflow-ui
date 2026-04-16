"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, usePathname } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Building2, ChevronsUpDown, Shield, Search } from "lucide-react";

// Shape returned by GET /api/v1/admin/tenants
type AdminTenant = {
  id: string;
  slug: string;
  name: string;
  business_type?: string;
  status?: string;
};

/**
 * TenantSwitcher: only rendered for platform owners. Lets them jump into any
 * tenant dashboard. The picked slug becomes part of the URL (`/{slug}/dashboard`)
 * so every subsequent API call already sends `X-Tenant-Slug` via the axios
 * interceptor. No separate "acting as" state to keep in sync.
 *
 * When already inside a tenant view, the current tenant is shown at the top
 * with a "Back to platform" control.
 */
export function TenantSwitcher() {
  const { user } = useAuthStore();
  const isPO = user?.isPlatformOwner === true;

  const params = useParams<{ orgSlug?: string }>();
  const pathname = usePathname();
  const router = useRouter();

  const [query, setQuery] = useState("");

  const currentSlug = params?.orgSlug;
  const onPlatformRoute = pathname?.startsWith("/platform");

  const { data } = useQuery({
    queryKey: ["admin-tenants"],
    queryFn: async () => {
      const r = await apiClient.get<{ tenants: AdminTenant[] }>(
        `/api/v1/admin/tenants?active=true`,
      );
      return r.data.tenants ?? [];
    },
    enabled: isPO,
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = query.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.business_type ?? "").toLowerCase().includes(q),
    );
  }, [data, query]);

  if (!isPO) return null;

  const active = data?.find((t) => t.slug === currentSlug);
  const buttonLabel = onPlatformRoute
    ? "Platform console"
    : active
    ? active.name
    : currentSlug ?? "Switch tenant";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex min-w-[180px] items-center justify-between gap-2 rounded-md border bg-background px-3 py-1.5 text-sm hover:bg-accent">
        <span className="flex items-center gap-2 truncate">
          {onPlatformRoute ? (
            <Shield className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Building2 className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="truncate">{buttonLabel}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72 p-0">
        {/* Current context + back-to-platform */}
        <div className="flex items-center justify-between border-b px-3 py-2">
          <div className="text-xs">
            <div className="text-muted-foreground">Current</div>
            <div className="font-medium">
              {onPlatformRoute ? "Platform console" : active?.name || currentSlug || "—"}
            </div>
          </div>
          {!onPlatformRoute && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={() => router.push("/platform")}
            >
              Back to platform
            </Button>
          )}
        </div>

        {/* Search */}
        <div className="p-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="h-8 pl-7 text-xs"
              placeholder="Search tenants…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          {data ? `${filtered.length} tenant${filtered.length === 1 ? "" : "s"}` : "Loading…"}
        </DropdownMenuLabel>

        <div className="max-h-64 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-center text-xs text-muted-foreground">
              {query ? "No matches" : "No tenants found"}
            </div>
          ) : (
            filtered.map((t) => (
              <DropdownMenuItem
                key={t.id}
                className="flex items-start justify-between gap-2"
                onSelect={() => {
                  // Navigate into the tenant's dashboard; axios interceptor
                  // picks up the slug from the URL automatically.
                  router.push(`/${t.slug}/dashboard`);
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="truncate font-mono text-xs text-muted-foreground">
                    /{t.slug}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  {t.business_type && (
                    <Badge variant="outline" className="text-[10px]">
                      {t.business_type}
                    </Badge>
                  )}
                  {t.status && t.status !== "active" && (
                    <Badge variant="secondary" className="text-[10px]">
                      {t.status}
                    </Badge>
                  )}
                </div>
              </DropdownMenuItem>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
