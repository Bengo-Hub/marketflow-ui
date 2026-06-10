"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { ArrowLeft, TrendingUp, MousePointerClick, Target, Coins } from "lucide-react";
import { SendSMSDialog } from "./send-sms-dialog";

type SeriesRow = {
  date: string;
  impressions: number;
  clicks: number;
  leads: number;
  spend: number;
  ctr: number;
  cpl: number;
  currency: string;
};

type CampaignMetricsResponse = {
  campaign_id: string;
  days: number;
  series: SeriesRow[];
  totals: {
    impressions: number;
    clicks: number;
    leads: number;
    spend: number;
    avg_ctr: number;
    avg_cpl: number;
    data_points: number;
  };
};

type Campaign = {
  id: string;
  name: string;
  platform: string;
  status: string;
  budget_daily?: number;
  currency?: string;
  meta_campaign_id?: string;
};

export default function CampaignAnalyticsPage({
  params,
}: {
  params: Promise<{ orgSlug: string; id: string }>;
}) {
  const { orgSlug, id } = use(params);

  const { data: campaign } = useQuery<Campaign>({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const r = await apiClient.get<{ data: Campaign }>(`/api/v1/campaigns/${id}`);
      return r.data.data;
    },
  });

  const { data: metrics, isLoading } = useQuery<CampaignMetricsResponse>({
    queryKey: ["campaign-metrics", id],
    queryFn: async () => {
      const r = await apiClient.get<CampaignMetricsResponse>(
        `/api/v1/analytics/campaigns/${id}?days=30`,
      );
      return r.data;
    },
    refetchInterval: 60_000,
  });

  const totals = metrics?.totals;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={`/${orgSlug}/campaigns`}
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Campaigns
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {campaign?.name ?? "Campaign"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Last 30 days ·{" "}
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">
                {campaign?.platform ?? "—"}
              </span>{" "}
              <span className="ml-1 text-xs">{campaign?.status}</span>
            </p>
          </div>
          <SendSMSDialog campaignId={id} campaignName={campaign?.name} />
        </div>
      </div>

      {!metrics?.series.length && !isLoading && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            {campaign?.meta_campaign_id
              ? "No metrics yet — Meta takes up to 15 minutes to return new campaign data."
              : "Connect this campaign to Meta to start seeing impressions, clicks and spend here."}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Impressions"
          value={totals?.impressions ?? 0}
          icon={<TrendingUp className="h-4 w-4 text-muted-foreground" />}
          loading={isLoading}
        />
        <KpiCard
          label="Clicks"
          value={totals?.clicks ?? 0}
          sub={totals ? `${totals.avg_ctr.toFixed(2)}% CTR` : undefined}
          icon={<MousePointerClick className="h-4 w-4 text-muted-foreground" />}
          loading={isLoading}
        />
        <KpiCard
          label="Leads"
          value={totals?.leads ?? 0}
          sub={totals && totals.leads > 0 ? `${formatCurrency(totals.avg_cpl)} CPL` : undefined}
          icon={<Target className="h-4 w-4 text-muted-foreground" />}
          loading={isLoading}
        />
        <KpiCard
          label="Spend"
          value={formatCurrency(totals?.spend ?? 0)}
          icon={<Coins className="h-4 w-4 text-muted-foreground" />}
          loading={isLoading}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Daily breakdown</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : metrics?.series.length ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2">Date</th>
                  <th className="py-2">Impr.</th>
                  <th className="py-2">Clicks</th>
                  <th className="py-2">CTR</th>
                  <th className="py-2">Leads</th>
                  <th className="py-2">CPL</th>
                  <th className="py-2 text-right">Spend</th>
                </tr>
              </thead>
              <tbody>
                {metrics.series.map((row) => (
                  <tr key={row.date} className="border-b last:border-b-0">
                    <td className="py-2 font-medium">{row.date}</td>
                    <td className="py-2">{row.impressions.toLocaleString()}</td>
                    <td className="py-2">{row.clicks.toLocaleString()}</td>
                    <td className="py-2">{row.ctr.toFixed(2)}%</td>
                    <td className="py-2">{row.leads.toLocaleString()}</td>
                    <td className="py-2">{row.leads > 0 ? formatCurrency(row.cpl) : "—"}</td>
                    <td className="py-2 text-right">{formatCurrency(row.spend)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No data.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  icon,
  loading,
}: {
  label: string;
  value: number | string;
  sub?: string;
  icon?: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-xs font-medium uppercase text-muted-foreground">
          {label}
        </CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-semibold tracking-tight">
            {typeof value === "number" ? value.toLocaleString() : value}
          </div>
        )}
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(n || 0);
}
