"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Coins, Eye, MousePointerClick, Pause, Play, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadTrendChart } from "@/components/dashboard/charts";
import type { DataTableColumn } from "@bengo-hub/shared-ui-lib/data-table";
import { CapsuleTabs, EmptyState, ErrorState, GlassPanel, ListTable, StatCard, StatusBadge, ToneBadge, humanize } from "@/components/ui-kit";
import { useCampaign, useCampaignAction, useCampaignMetrics } from "@/hooks/use-campaigns";
import { formatMoney, type CampaignMetrics } from "@/lib/api/campaigns";

type Point = CampaignMetrics["series"][number];
import { SendSMSDialog } from "./send-sms-dialog";

const nf = new Intl.NumberFormat("en-KE");
const dayFmt = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short" });

export default function CampaignDetailPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>();
  const [days, setDays] = useState("30");
  const campaign = useCampaign(id);
  const metrics = useCampaignMetrics(id, Number(days));
  const action = useCampaignAction();
  const c = campaign.data;
  const t = metrics.data?.totals;
  const currency = metrics.data?.series[0]?.currency || c?.currency || "KES";
  const series = metrics.data?.series ?? [];
  const num = (key: keyof Point & string, header: string, fmt: (r: Point) => string) =>
    ({ key, header, align: "right", sortable: true, accessor: (r: Point) => r[key], render: (r: Point) => <span className="tabular">{fmt(r)}</span> }) as DataTableColumn<Point>;
  const dailyColumns: DataTableColumn<Point>[] = [
    { key: "date", header: "Day", primary: true, sortable: true, accessor: (r) => r.date, render: (r) => <span className="font-medium">{dayFmt.format(new Date(`${r.date}T00:00:00`))}</span> },
    num("impressions", "Impressions", (r) => nf.format(r.impressions)),
    num("clicks", "Clicks", (r) => nf.format(r.clicks)),
    num("ctr", "Click rate", (r) => `${r.ctr.toFixed(2)}%`),
    num("leads", "Leads", (r) => nf.format(r.leads)),
    num("cpl", "Per lead", (r) => (r.leads > 0 ? formatMoney(r.cpl, r.currency) : "")),
    num("spend", "Spend", (r) => formatMoney(r.spend, r.currency)),
  ];

  return (
    <div className="space-y-6">
      <Link href={`/${orgSlug}/campaigns`} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        All campaigns
      </Link>

      {campaign.isError && <ErrorState message="Could not load this campaign." onRetry={() => void campaign.refetch()} />}

      <div className="glass flex flex-col gap-4 rounded-[1.25rem] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">{c?.name ?? "Campaign"}</h1>
          {c && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge status={c.status} />
              <ToneBadge>{humanize(c.platform)}</ToneBadge>
              {c.channel && <ToneBadge tone="info">{c.channel === "sms" ? "SMS" : humanize(c.channel)}</ToneBadge>}
              {c.budget_daily ? <span className="text-sm text-muted-foreground">{formatMoney(c.budget_daily, c.currency)} a day</span> : null}
            </div>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {c?.status === "active" && (
            <Button variant="outline" disabled={action.isPending} onClick={() => action.mutate({ id, action: "pause" })}>
              <Pause /> Pause
            </Button>
          )}
          {(c?.status === "paused" || c?.status === "draft") && (
            <Button disabled={action.isPending} onClick={() => action.mutate({ id, action: "resume" })}>
              <Play /> {c.status === "draft" ? "Start" : "Resume"}
            </Button>
          )}
          <SendSMSDialog campaignId={id} campaignName={c?.name} />
        </div>
      </div>

      <div className="flex justify-end">
        <CapsuleTabs label="Period" value={days} onChange={setDays} options={[{ value: "7", label: "7 days" }, { value: "30", label: "30 days" }, { value: "90", label: "90 days" }]} />
      </div>

      {metrics.isError && <ErrorState message="Could not load the campaign numbers." onRetry={() => void metrics.refetch()} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Impressions" icon={<Eye />} loading={metrics.isLoading} value={nf.format(t?.impressions ?? 0)} />
        <StatCard label="Clicks" icon={<MousePointerClick />} loading={metrics.isLoading} value={nf.format(t?.clicks ?? 0)} hint={t ? `${t.avg_ctr.toFixed(2)}% of impressions` : undefined} />
        <StatCard label="Leads" icon={<Target />} loading={metrics.isLoading} value={nf.format(t?.leads ?? 0)} hint={t && t.leads > 0 ? `${formatMoney(t.avg_cpl, currency)} per lead` : undefined} />
        <StatCard label="Spend" icon={<Coins />} loading={metrics.isLoading} value={formatMoney(t?.spend ?? 0, currency)} />
      </div>

      {!metrics.isLoading && series.length === 0 ? (
        <GlassPanel title="Daily results">
          <EmptyState
            icon={<Target />}
            title="No ad results yet"
            description={
              c?.meta_campaign_id
                ? "Meta can take up to 15 minutes to report a new campaign."
                : "Results appear here once this campaign is linked to a Meta ad campaign."
            }
            action={<Link href={`/${orgSlug}/settings/integrations`} className="text-sm font-semibold text-primary hover:underline">Connected accounts</Link>}
          />
        </GlassPanel>
      ) : (
        <>
          <GlassPanel title="Leads per day">
            {metrics.isLoading ? <div className="h-64 animate-pulse rounded-xl bg-muted" /> : <LeadTrendChart data={series.map((s) => ({ day: s.date, count: s.leads }))} />}
          </GlassPanel>
          <section>
            <h2 className="mb-3 font-display text-base font-semibold">Daily results</h2>
            <ListTable<Point>
              columns={dailyColumns}
              rows={series}
              rowKey={(r) => r.date}
              loading={metrics.isLoading}
              defaultSort={{ key: "date", dir: "desc" }}
              showExportCsv
              exportFileName="campaign-daily-results"
            />
          </section>
        </>
      )}
    </div>
  );
}
