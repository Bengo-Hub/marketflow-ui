"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Integration = {
  provider: string;
  name: string;
  connected: boolean;
  fields: Record<string, string>;
};

const catalog: Record<string, { title: string; description: string; provider: string }> = {
  google_calendar: {
    title: "Google Calendar",
    description:
      "Push every meeting you schedule to your Google Calendar. Attendees receive an invite with a Google Meet link.",
    provider: "google",
  },
  meta_ads: {
    title: "Facebook / Instagram",
    description:
      "Connect your Facebook Page to receive leads from Meta Lead Ads into MarketFlow automatically.",
    provider: "meta",
  },
};

export default function IntegrationsPage() {
  const qc = useQueryClient();
  const params = useSearchParams();

  const { data, isLoading } = useQuery({
    queryKey: ["integrations"],
    queryFn: async () => {
      const r = await apiClient.get<{ integrations: Integration[] }>(`/api/v1/integrations`);
      return r.data;
    },
    refetchInterval: 30_000,
  });

  const connect = useMutation({
    mutationFn: async (provider: "google" | "meta") => {
      const r = await apiClient.get<{ url: string }>(`/api/v1/integrations/${provider}/authorize`);
      window.location.href = r.data.url;
    },
  });

  const disconnect = useMutation({
    mutationFn: async (providerType: string) =>
      apiClient.delete(`/api/v1/integrations/${providerType}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["integrations"] }),
  });

  const googleConnected = data?.integrations.some(
    (i) => i.provider === "google_calendar" && i.connected,
  );
  const metaConnected = data?.integrations.some(
    (i) => i.provider === "meta_ads" && i.connected,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Integrations</h1>
        <p className="text-sm text-muted-foreground">
          Connect MarketFlow to the tools you already use. Platform-wide provider credentials
          (Groq, Tavily, Meta App) are managed by platform admins — not here.
        </p>
      </div>

      {params.get("google") === "connected" && (
        <div className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          ✓ Google Calendar connected. Meetings will sync automatically.
        </div>
      )}
      {params.get("meta") === "connected" && (
        <div className="rounded border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-800">
          ✓ Facebook Page connected{" "}
          {params.get("page") && <>(<strong>{params.get("page")}</strong>)</>}.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <IntegrationCard
          title={catalog.google_calendar.title}
          description={catalog.google_calendar.description}
          connected={!!googleConnected}
          loading={isLoading}
          onConnect={() => connect.mutate("google")}
          onDisconnect={() => disconnect.mutate("google_calendar")}
          fields={data?.integrations.find((i) => i.provider === "google_calendar")?.fields}
        />
        <IntegrationCard
          title={catalog.meta_ads.title}
          description={catalog.meta_ads.description}
          connected={!!metaConnected}
          loading={isLoading}
          onConnect={() => connect.mutate("meta")}
          onDisconnect={() => disconnect.mutate("meta_ads")}
          fields={data?.integrations.find((i) => i.provider === "meta_ads")?.fields}
        />
      </div>
    </div>
  );
}

function IntegrationCard({
  title,
  description,
  connected,
  loading,
  onConnect,
  onDisconnect,
  fields,
}: {
  title: string;
  description: string;
  connected: boolean;
  loading: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
  fields?: Record<string, string>;
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-base font-medium">{title}</div>
            <div className="text-sm text-muted-foreground">{description}</div>
          </div>
          <span
            className={`rounded-full px-2 py-0.5 text-xs ${
              connected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-600"
            }`}
          >
            {loading ? "…" : connected ? "Connected" : "Not connected"}
          </span>
        </div>
        {connected && fields && Object.keys(fields).length > 0 && (
          <dl className="rounded bg-muted/30 p-3 text-xs">
            {Object.entries(fields).map(([k, v]) => (
              <div key={k} className="flex gap-2">
                <dt className="w-32 text-muted-foreground">{k}</dt>
                <dd className="font-mono">{v || "—"}</dd>
              </div>
            ))}
          </dl>
        )}
        {loading ? (
          <Skeleton className="h-9 w-32" />
        ) : connected ? (
          <Button variant="outline" size="sm" onClick={onDisconnect}>
            Disconnect
          </Button>
        ) : (
          <Button size="sm" onClick={onConnect}>
            Connect {title}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
