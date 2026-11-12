"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderLogo } from "@/components/providers/provider-logo";
import { tenantIntegrations } from "@/lib/providers/catalog";
import { connectErrorText, connectProviders } from "@/lib/integrations/connect-result";
import { ConnectedAccounts, type ConnectedAccount } from "@/components/providers/connected-accounts";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { useMyAccess } from "@/hooks/use-access";
import { canConnectIntegration, isRestricted } from "@/lib/access/role-access";

type Integration = {
  provider: string;
  name: string;
  connected: boolean;
  fields: Record<string, string>;
  accounts?: ConnectedAccount[];
};

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const params = useSearchParams();
  // Owner 2026-11-12: connecting is admin only (the app reviewer may connect Meta); the API decides.
  const { data: access } = useMyAccess();
  const restricted = isRestricted(access);

  const { data, isLoading, error } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const r = await apiClient.get<{ integrations: Integration[] }>(`/api/v1/integrations`);
      return r.data;
    },
    refetchInterval: 30_000,
  });

  const { data: availableData } = useQuery({
    queryKey: ["integrations-available"],
    queryFn: async () => {
      const r = await apiClient.get<{ available: string[] }>(`/api/v1/integrations/available`);
      return r.data;
    },
    staleTime: 60_000,
  });

  const availableTypes = new Set(availableData?.available ?? []);

  const connect = useMutation({
    mutationFn: async (providerType: string) => {
      // Each provider's own authorize route from the catalog. Deriving it from the type sent
      // google_ads to the Google Calendar flow.
      const entry = tenantIntegrations.find((i) => i.id === providerType);
      if (!entry) throw new Error(`No connect flow for ${providerType}`);
      const r = await apiClient.get<{ url: string }>(entry.authorizePath);
      window.location.href = r.data.url;
    },
  });

  const disconnect = useMutation({
    mutationFn: async (providerType: string) =>
      apiClient.delete(`/api/v1/integrations/${providerType}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  function rowFor(providerType: string) {
    return data?.integrations.find((i) => i.provider === providerType);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect the tools you already use. Shared infrastructure credentials (AI models,
          OAuth app secrets) are managed by the platform — you&apos;ll never see them here.
        </p>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load integrations: {(error as Error).message}
        </div>
      )}

      {/* Success banners from OAuth redirects */}
      {params.get("google") === "connected" && (
        <Banner ok text="Google Calendar connected. Meetings will sync automatically." />
      )}
      {params.get("meta") === "connected" && (
        <Banner
          ok
          text={`Facebook Page connected${params.get("page") ? ` — ${params.get("page")}` : ""}.`}
        />
      )}
      {params.get("tiktok") === "connected" && (
        <Banner ok text="TikTok for Business connected. You can now run TikTok campaigns." />
      )}
      {/* Failure banners: the callback returns ?<provider>=error&reason=<code>. */}
      {connectProviders.map((p) => {
        const text = params.get(p) === "error" ? connectErrorText(p, params.get("reason") ?? "") : null;
        return text ? <Banner key={p} text={text} /> : null;
      })}

      <div className="grid gap-4 md:grid-cols-2">
        {tenantIntegrations.filter((it) => availableTypes.has(it.requiresPlatformConfig)).map((it) => {
          const existing = rowFor(it.id);
          const connected = !!existing?.connected;
          const canConnect = canConnectIntegration(access, it.authorizePath);
          return (
            <div
              key={it.id}
              className="flex flex-col gap-4 rounded-xl border bg-card p-5 transition hover:shadow-sm"
            >
              <div className="flex items-start gap-3">
                <ProviderLogo
                  slug={it.logoSlug}
                  color={it.logoColor}
                  brandColor={it.brandColor}
                  name={it.name}
                  size={44}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate text-base font-semibold">{it.name}</h3>
                    {isLoading ? (
                      <Skeleton className="h-5 w-20" />
                    ) : connected ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                        <CheckCircle2 className="mr-1 h-3 w-3" /> Connected
                      </Badge>
                    ) : (
                      <Badge variant="outline">Not connected</Badge>
                    )}
                  </div>
                  <p className="mt-0.5 text-sm text-muted-foreground">{it.description}</p>
                </div>
              </div>

              {connected && existing?.accounts && existing.accounts.length > 0 && (
                <ConnectedAccounts accounts={existing.accounts} />
              )}
              {connected && !existing?.accounts?.length && existing?.fields && Object.keys(existing.fields).length > 0 && (
                <dl className="rounded-md bg-muted/40 p-3 text-xs">
                  {Object.entries(existing.fields)
                    .slice(0, 4)
                    .map(([k, v]) => (
                      <div key={k} className="flex gap-2 py-0.5">
                        <dt className="w-28 text-muted-foreground">{k}</dt>
                        <dd className="truncate font-mono">{v || "—"}</dd>
                      </div>
                    ))}
                </dl>
              )}

              <div className="mt-auto flex items-center gap-2">
                {connected ? (
                  <>
                    {!it.comingSoon && it.id !== "google_calendar" && canConnect && (
                      // Re-runs the connect so the tenant can tick more Pages, an Instagram
                      // account or ad accounts (Meta: choose "Edit settings" in its dialog).
                      <Button size="sm" variant="outline" onClick={() => connect.mutate(it.id)}>
                        Add or change accounts
                        <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                      </Button>
                    )}
                    {!restricted && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => disconnect.mutate(it.id)}
                      >
                        Disconnect
                      </Button>
                    )}
                  </>
                ) : it.comingSoon ? (
                  <Button size="sm" variant="outline" disabled>
                    Coming soon
                  </Button>
                ) : !canConnect ? (
                  <p className="text-xs text-muted-foreground">Ask a MarketFlow admin to connect this.</p>
                ) : (
                  <Button
                    size="sm"
                    onClick={() => connect.mutate(it.id)}
                    style={{ background: it.brandColor }}
                    className="text-white hover:opacity-90"
                  >
                    Connect {it.name}
                    <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Banner({ ok, text }: { ok?: boolean; text: string }) {
  return (
    <div
      className={`rounded border px-3 py-2 text-sm ${
        ok
          ? "border-green-300 bg-green-50 text-green-800"
          : "border-red-300 bg-red-50 text-red-800"
      }`}
    >
      {ok ? "✓ " : ""}{text}
    </div>
  );
}
