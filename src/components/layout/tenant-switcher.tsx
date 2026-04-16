"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter, usePathname } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";
import { Building2, ChevronsUpDown, Shield, Search, X } from "lucide-react";

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
 * tenant's dashboard. The picked slug becomes part of the URL so every
 * subsequent API call already sends X-Tenant-Slug via the axios interceptor.
 *
 * Intentionally does NOT use the base-ui DropdownMenu primitives — that
 * component doesn't play well with arbitrary children (nested inputs,
 * multi-element rows) which caused runtime slot errors. A tiny custom popover
 * keeps full control of focus + rendering.
 */
export function TenantSwitcher() {
  const { user } = useAuthStore();
  const isPO = user?.isPlatformOwner === true;

  const params = useParams<{ orgSlug?: string }>();
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const panelRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

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

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  if (!isPO) return null;

  const active = data?.find((t) => t.slug === currentSlug);
  const buttonLabel = onPlatformRoute
    ? "Platform console"
    : active
    ? active.name
    : currentSlug ?? "Switch tenant";

  function pick(slug: string) {
    setOpen(false);
    setQuery("");
    router.push(`/${slug}/dashboard`);
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 min-w-[200px] items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm hover:bg-accent"
      >
        <span className="flex items-center gap-2 truncate">
          {onPlatformRoute ? (
            <Shield className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Building2 className="h-4 w-4 text-muted-foreground" />
          )}
          <span className="truncate">{buttonLabel}</span>
        </span>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <div
          ref={panelRef}
          className="absolute left-0 top-10 z-50 w-80 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          {/* Header: current context + back to platform */}
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="text-xs">
              <div className="text-muted-foreground">Current</div>
              <div className="font-medium">
                {onPlatformRoute ? "Platform console" : active?.name || currentSlug || "—"}
              </div>
            </div>
            {!onPlatformRoute && (
              <button
                type="button"
                className="text-xs font-medium text-[var(--brand-primary)] hover:underline"
                onClick={() => {
                  setOpen(false);
                  router.push("/platform");
                }}
              >
                Back to platform
              </button>
            )}
          </div>

          {/* Search */}
          <div className="border-b p-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                autoFocus
                type="text"
                placeholder="Search tenants…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 w-full rounded border bg-background pl-7 pr-7 text-xs outline-none focus:border-[var(--brand-primary)]"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-72 overflow-y-auto py-1">
            {!data ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                Loading…
              </div>
            ) : filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                {query ? "No matches" : "No tenants"}
              </div>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => pick(t.slug)}
                  className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-accent ${
                    t.slug === currentSlug ? "bg-accent/60" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{t.name}</span>
                    <span className="block truncate font-mono text-xs text-muted-foreground">
                      /{t.slug}
                    </span>
                  </span>
                  <span className="flex flex-col items-end gap-0.5">
                    {t.business_type && (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                        {t.business_type}
                      </span>
                    )}
                    {t.status && t.status !== "active" && (
                      <span className="rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] text-yellow-800">
                        {t.status}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
