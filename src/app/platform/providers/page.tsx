"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { providerCatalog } from "@/lib/providers/catalog";
import { ProviderCard } from "@/components/providers/provider-card";
import { Skeleton } from "@/components/ui/skeleton";

type ProviderRow = {
  id: string;
  provider_type: string;
  provider_name: string;
  is_active?: boolean;
  status?: string;
};

/**
 * Platform-level provider configuration.
 *
 * Catalog-driven (src/lib/providers/catalog.ts). Adding a new integration
 * only requires appending a ProviderDef — no UI changes here. Prefilled
 * defaults for every well-known vendor; secrets remain platform-only.
 */
export default function PlatformProvidersPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin-providers"],
    queryFn: async () => {
      const r = await apiClient.get<{ data: ProviderRow[] }>(`/api/v1/admin/providers`);
      return r.data.data ?? [];
    },
    refetchInterval: 30_000,
  });

  function rowFor(type: string, id: string) {
    return data?.find((p) => p.provider_type === type && p.provider_name === id);
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Platform integrations</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure AI, advertising, scheduling and messaging providers used across every tenant.
          Secrets are encrypted at rest with AES-256-GCM; values are never displayed in clear text
          after save.
        </p>
      </header>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load provider list: {(error as Error).message}
        </div>
      )}

      {providerCatalog.map((cat) => (
        <section key={cat.id} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold">{cat.label}</h2>
            <p className="text-sm text-muted-foreground">{cat.description}</p>
          </div>

          {isLoading ? (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              {cat.providers.map((p) => (
                <div key={`${p.type}:${p.id}`} className="rounded-xl border bg-card p-5">
                  <Skeleton className="mb-3 h-8 w-40" />
                  <Skeleton className="mb-2 h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-2">
              {cat.providers.map((p) => (
                <ProviderCard
                  key={`${p.type}:${p.id}`}
                  provider={p}
                  existing={rowFor(p.type, p.id)}
                />
              ))}
            </div>
          )}
        </section>
      ))}
    </div>
  );
}
