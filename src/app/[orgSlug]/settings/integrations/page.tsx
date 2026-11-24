"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ProviderLogo } from "@/components/providers/provider-logo";
import { tenantIntegrations } from "@/lib/providers/catalog";
import { connectErrorHelp, connectErrorText, connectProviders } from "@/lib/integrations/connect-result";
import { ConnectedAccounts } from "@/components/providers/connected-accounts";
import { AlertTriangle, CheckCircle2, ExternalLink } from "lucide-react";
import { useMyAccess } from "@/hooks/use-access";
import { canConnectIntegration, isRestricted } from "@/lib/access/role-access";
import { integrationsApi, needsReconnect } from "@/lib/api/integrations";

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const params = useSearchParams();
  // Owner 2026-11-12: connecting is admin only (the app reviewer may connect Meta); the API decides.
  const { data: access } = useMyAccess();
  const restricted = isRestricted(access);

  const { data, isLoading, error } = useQuery({
    queryKey: ["integrations"],
    queryFn: integrationsApi.list,
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
      // Credentialed, so the browser keeps the OAuth nonce cookie the API sets here; the
      // callback checks it, which ties the consent to this browser (single-use bound state).
      const r = await apiClient.get<{ url: string }>(entry.authorizePath, { withCredentials: true });
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
        <p className="mt-1 text-sm">
          <Link className="underline" href={`/${orgSlug}/settings/ads-setup`}>Check what your ad accounts still need</Link>
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
      {params.get("google_ads") === "connected" && (
        <Banner
          ok
          text={`Google Ads connected${params.get("account") ? `: ${params.get("account")}` : ""}. Its results are on the Campaigns page, where you can also send your leads back to it as conversions.`}
        />
      )}
      {params.get("youtube") === "connected" && (
        <Banner
          ok
          text={`YouTube channel connected${params.get("channel") ? `: ${params.get("channel")}` : ""}. Approved videos can now be posted to it as Shorts.`}
        />
      )}
      {params.get("tiktok_creator") === "connected" && (
        <Banner
          ok
          text={`TikTok account connected${params.get("account") ? `: ${params.get("account")}` : ""}. Approved videos can now be posted to it.`}
        />
      )}
      {/* Failure banners: the callback returns ?<provider>=error&reason=<code>. */}
      {connectProviders.map((p) => {
        const failed = params.get(p) === "error";
        const text = failed ? connectErrorText(p, params.get("reason") ?? "") : null;
        return text ? <Banner key={p} text={text} help={connectErrorHelp(p, params.get("reason"))} /> : null;
      })}

      <div className="grid gap-4 md:grid-cols-2">
        {tenantIntegrations.filter((it) => availableTypes.has(it.requiresPlatformConfig)).map((it) => {
          const existing = rowFor(it.id);
          const connected = !!existing?.connected;
          const canConnect = canConnectIntegration(access, it.authorizePath);
          const stale = connected ? (existing?.accounts ?? []).filter(needsReconnect) : [];
          const anyExpired = stale.some((a) => a.health === "expired");
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
                    ) : connected && stale.length > 0 ? (
                      <Badge variant="outline" className={anyExpired ? "border-destructive/40 text-destructive" : "border-warning/40 text-warning"}>
                        <AlertTriangle className="mr-1 h-3 w-3" /> {anyExpired ? "Needs reconnecting" : "Expiring soon"}
                      </Badge>
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

              {stale.length > 0 && (
                // Reconnect prompt (Sprint 16): the same connect flow refreshes every token.
                <div
                  role="alert"
                  className={`flex flex-col gap-2 rounded-md border px-3 py-2 text-sm sm:flex-row sm:items-center ${
                    anyExpired ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-warning/40 bg-warning/10 text-warning"
                  }`}
                >
                  <p className="flex-1">
                    {anyExpired
                      ? `${stale.length === 1 ? "One account has" : `${stale.length} accounts have`} stopped working. Posts, lead reading and ads for ${stale.length === 1 ? "it" : "them"} are paused until you connect ${it.name} again.`
                      : `${stale.length === 1 ? "One account expires" : `${stale.length} accounts expire`} soon. Connect ${it.name} again before then so nothing stops.`}
                  </p>
                  {canConnect ? (
                    <Button size="sm" onClick={() => connect.mutate(it.id)} disabled={connect.isPending}>
                      Reconnect
                      <ExternalLink className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  ) : (
                    <p className="text-xs">Ask a MarketFlow admin to reconnect.</p>
                  )}
                </div>
              )}
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

function Banner({ ok, text, help }: { ok?: boolean; text: string; help?: { label: string; href: string } | null }) {
  return (
    <div
      className={`rounded border px-3 py-2 text-sm ${
        ok
          ? "border-green-300 bg-green-50 text-green-800"
          : "border-red-300 bg-red-50 text-red-800"
      }`}
    >
      {ok ? "✓ " : ""}{text}
      {help && (
        <a href={help.href} target="_blank" rel="noopener noreferrer" className="ml-2 inline-flex items-center gap-1 font-medium underline">
          {help.label} <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </div>
  );
}
