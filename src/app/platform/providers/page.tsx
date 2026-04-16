"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { providerCatalog } from "@/lib/providers/catalog";
import { ProviderCard } from "@/components/providers/provider-card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { ArrowUpRight, BrainCircuit, Megaphone, CalendarClock, MessageSquareMore } from "lucide-react";

type ProviderRow = {
  id: string;
  provider_type: string;
  provider_name: string;
  is_active?: boolean;
  status?: string;
};

const TAB_ICON: Record<string, React.ComponentType<{ className?: string }>> = {
  ai: BrainCircuit,
  ads: Megaphone,
  scheduling: CalendarClock,
  messaging: MessageSquareMore,
};

/**
 * Platform-level provider configuration.
 *
 * Catalog-driven (src/lib/providers/catalog.ts) with tabbed grouping.
 * Adding a new integration only requires appending a ProviderDef to the
 * catalog — no UI changes here. Prefilled defaults for every well-known
 * vendor; secrets remain platform-only.
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

  function countConfigured(categoryId: string): number {
    const cat = providerCatalog.find((c) => c.id === categoryId);
    if (!cat || !data) return 0;
    return cat.providers.filter((p) => {
      const row = rowFor(p.type, p.id);
      return row && row.is_active !== false;
    }).length;
  }

  return (
    <div className="space-y-6">
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

      <Tabs defaultValue="ai" className="w-full">
        <TabsList className="grid w-full grid-cols-4 md:w-auto md:inline-flex">
          {providerCatalog.map((cat) => {
            const Icon = TAB_ICON[cat.id] ?? BrainCircuit;
            const count = countConfigured(cat.id);
            return (
              <TabsTrigger key={cat.id} value={cat.id} className="gap-1.5">
                <Icon className="h-4 w-4" />
                {cat.label.split(" ")[0]}
                {count > 0 && (
                  <Badge
                    variant="secondary"
                    className="ml-1 h-4 min-w-[1rem] px-1 text-[10px]"
                  >
                    {count}
                  </Badge>
                )}
              </TabsTrigger>
            );
          })}
          <TabsTrigger value="messaging" className="gap-1.5">
            <MessageSquareMore className="h-4 w-4" />
            Messaging
          </TabsTrigger>
        </TabsList>

        {providerCatalog.map((cat) => (
          <TabsContent key={cat.id} value={cat.id} className="mt-6 space-y-4">
            <div>
              <h2 className="text-lg font-semibold">{cat.label}</h2>
              <p className="text-sm text-muted-foreground">{cat.description}</p>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2">
                {cat.providers.map((p) => (
                  <div key={`${p.type}:${p.id}`} className="rounded-xl border bg-card p-5">
                    <Skeleton className="mb-3 h-8 w-40" />
                    <Skeleton className="mb-2 h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {cat.providers.map((p) => (
                  <ProviderCard
                    key={`${p.type}:${p.id}`}
                    provider={p}
                    existing={rowFor(p.type, p.id)}
                  />
                ))}
              </div>
            )}
          </TabsContent>
        ))}

        <TabsContent value="messaging" className="mt-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold">Messaging channels</h2>
            <p className="text-sm text-muted-foreground">
              Email / SMS / WhatsApp / Push providers are owned by the notifications service and
              shared across every SSO-integrated app. Configure them from the notifications console
              and MarketFlow will dispatch through there automatically.
            </p>
          </div>
          <Link
            href="https://notifications.codevertexitsolutions.com/platform/providers"
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border bg-card p-5 shadow-sm transition hover:shadow"
          >
            <MessageSquareMore className="h-10 w-10 text-muted-foreground" />
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold">Open notifications console</h3>
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <p className="text-sm text-muted-foreground">
                SendGrid, Twilio, WhatsApp Business, FCM, APNs — all configured in one place.
              </p>
            </div>
          </Link>
        </TabsContent>
      </Tabs>
    </div>
  );
}
