"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { providerCatalog, type ProviderDef } from "@/lib/providers/catalog";
import { ProviderCard, type ProviderBalance } from "@/components/providers/provider-card";
import { isWideCard, sectionsFor, type ProviderGroup, type ProviderSection } from "@/lib/providers/groups";
import { Skeleton } from "@/components/ui/skeleton";
import { CapsuleTabs, PageHeader, ToneBadge } from "@/components/ui-kit";
import { ArrowUpRight, MessageSquareMore, Plug, Star } from "lucide-react";

type ProviderRow = {
  id: string;
  provider_type: string;
  provider_name: string;
  is_active?: boolean;
  status?: string;
};

const MESSAGING = "messaging";

/** Short tab names; the section heading under the tabs carries the full label. */
const TAB_LABEL: Record<string, string> = {
  ai: "AI",
  ads: "Advertising",
  media: "Media",
  research: "Market research",
  scheduling: "Scheduling",
  publishing: "Social",
};

/**
 * Platform-level provider configuration.
 *
 * Catalog-driven (src/lib/providers/catalog.ts): adding an integration only means appending a
 * ProviderDef. Each tab is split into sections (sectionsFor). Simple key cards share a grid of
 * up to three columns sized by the content width; JSON and long settings cards (isWideCard)
 * take a full row each, so short and tall cards never sit side by side.
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

  const qc = useQueryClient();
  // Provider groups (one default each) and the media balances, both from marketflow-api.
  const groups = useQuery({
    queryKey: ["admin-provider-defaults"],
    queryFn: async () => (await apiClient.get<{ groups: ProviderGroup[] }>(`/api/v1/admin/providers/defaults`)).data.groups ?? [],
  });
  const balances = useQuery({
    queryKey: ["admin-provider-balances"],
    queryFn: async () =>
      (await apiClient.get<{ balances: Record<string, ProviderBalance> }>(`/api/v1/admin/providers/balances`)).data.balances ?? {},
    refetchInterval: 5 * 60_000,
  });
  const setDefault = useMutation({
    mutationFn: async (v: { group: string; provider: string }) => {
      await apiClient.post(`/api/v1/admin/providers/defaults`, v);
    },
    onSuccess: () => {
      toast.success("Default saved. Services pick it up within five minutes.");
      void qc.invalidateQueries({ queryKey: ["admin-provider-defaults"] });
    },
    onError: (e) => toast.error(`Could not set the default: ${(e as Error).message}`),
  });

  const [tab, setTab] = useState<string>("ai");

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

  function card(p: ProviderDef) {
    return (
      <ProviderCard
        key={`${p.type}:${p.id}`}
        provider={p}
        existing={rowFor(p.type, p.id)}
        balance={balances.data?.[p.id]}
        defaultFor={(groups.data ?? [])
          .filter((g) => g.members.length > 1 && g.members.includes(p.id))
          .map((g) => ({ id: g.id, label: g.label, isDefault: g.default === p.id }))}
        onSetDefault={(group) => setDefault.mutate({ group, provider: p.id })}
      />
    );
  }

  const tabs = [
    ...providerCatalog.map((cat) => {
      const n = countConfigured(cat.id);
      return { value: cat.id, label: TAB_LABEL[cat.id] ?? cat.label, count: n > 0 ? n : undefined };
    }),
    { value: MESSAGING, label: "Messaging" },
  ];
  const active = providerCatalog.find((c) => c.id === tab);
  const panelId = `providers-panel-${tab}`;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Plug />}
        title="Platform integrations"
        description="AI, advertising, media and publishing providers shared by every tenant. Secrets are encrypted at rest (AES-256-GCM) and never shown again after saving."
      />

      {error && (
        <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          Could not load the provider list: {(error as Error).message}
        </div>
      )}

      {/* The capsule row scrolls sideways on phones; every tab stays one tap away. */}
      <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <CapsuleTabs label="Provider categories" value={tab} onChange={setTab} options={tabs} />
      </div>

      <div id={panelId} role="tabpanel" aria-label={active?.label ?? "Messaging channels"} className="space-y-8">
        {active ? (
          <>
            <div className="max-w-3xl">
              <h2 className="font-display text-lg font-semibold text-foreground">{active.label}</h2>
              <p className="text-sm text-muted-foreground">{active.description}</p>
            </div>
            {isLoading ? (
              <CardGrid>
                {active.providers.slice(0, 6).map((p) => (
                  <div key={`${p.type}:${p.id}`} className="glass rounded-[1.25rem] p-5">
                    <Skeleton className="mb-3 h-8 w-40" />
                    <Skeleton className="mb-2 h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ))}
              </CardGrid>
            ) : (
              sectionsFor(active.providers, groups.data ?? []).map((section) => (
                <ProviderSectionBlock key={section.id} section={section}>
                  {(p) => card(p)}
                </ProviderSectionBlock>
              ))
            )}
          </>
        ) : (
          <>
            <div className="max-w-3xl">
              <h2 className="font-display text-lg font-semibold text-foreground">Messaging channels</h2>
              <p className="text-sm text-muted-foreground">
                Email, SMS, WhatsApp and push providers belong to the notifications service and are shared by every SSO app.
                Configure them in the notifications console; MarketFlow sends through it automatically.
              </p>
            </div>
            <a
              href="https://notifications.codevertexafrica.com/platform/providers"
              target="_blank"
              rel="noreferrer"
              className="glass flex max-w-xl items-center gap-4 rounded-[1.25rem] p-5 outline-none transition-shadow hover:shadow-lift focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <MessageSquareMore className="h-5 w-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5 font-display text-base font-semibold text-foreground">
                  Open notifications console <ArrowUpRight className="h-4 w-4" aria-hidden />
                </span>
                <span className="block text-sm text-muted-foreground">SendGrid, Twilio, WhatsApp Business, FCM and APNs in one place.</span>
              </span>
            </a>
          </>
        )}
      </div>
    </div>
  );
}

/** Up to three equal columns, chosen by the content width rather than the viewport. */
function CardGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="@container">
      <div className="grid grid-cols-1 gap-4 @2xl:grid-cols-2 @6xl:grid-cols-3">{children}</div>
    </div>
  );
}

function ProviderSectionBlock({
  section,
  children,
}: {
  section: ProviderSection;
  children: (p: ProviderDef) => React.ReactNode;
}) {
  const simple = section.providers.filter((p) => !isWideCard(p));
  const wide = section.providers.filter(isWideCard);
  const headingId = `providers-section-${section.id.replace(/[^a-z0-9]+/gi, "-")}`;
  const sub = !!section.parentLabel;

  return (
    <section aria-labelledby={section.label ? headingId : undefined} className={sub ? "-mt-4 space-y-3" : "space-y-3"}>
      {section.label && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/70 pb-2">
          <h3 id={headingId} className="flex items-baseline gap-1.5 font-display text-sm font-semibold text-foreground">
            {sub && (
              <span className="font-normal text-muted-foreground">
                {section.parentLabel}
                <span aria-hidden> /</span>
              </span>
            )}
            {section.label}
            <span className="text-xs font-normal text-muted-foreground tabular">({section.providers.length})</span>
          </h3>
          {section.defaultName && (
            <ToneBadge tone="primary">
              <Star aria-hidden /> Default: {section.defaultName}
            </ToneBadge>
          )}
        </div>
      )}
      {simple.length > 0 && <CardGrid>{simple.map(children)}</CardGrid>}
      {wide.map((p) => (
        <div key={`${p.type}:${p.id}:wide`}>{children(p)}</div>
      ))}
    </section>
  );
}
