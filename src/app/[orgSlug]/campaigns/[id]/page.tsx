"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Coins, Eye, MousePointerClick, Pause, Play, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LeadTrendChart } from "@/components/dashboard/charts";
import { CapsuleTabs, EmptyState, ErrorState, GlassPanel, StatCard, StatusBadge, ToneBadge, humanize } from "@/components/ui-kit";
import { useCampaign, useCampaignAction, useCampaignMetrics } from "@/hooks/use-campaigns";
import { formatMoney } from "@/lib/api/campaigns";
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
          <GlassPanel title="Daily results" bodyClassName="p-0 sm:p-5">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                    <th className="px-4 py-2">Day</th>
                    <th className="px-4 py-2 text-right">Impressions</th>
                    <th className="px-4 py-2 text-right">Clicks</th>
                    <th className="px-4 py-2 text-right">Click rate</th>
                    <th className="px-4 py-2 text-right">Leads</th>
                    <th className="px-4 py-2 text-right">Per lead</th>
                    <th className="px-4 py-2 text-right">Spend</th>
                  </tr>
                </thead>
                <tbody className="tabular">
                  {series.map((r) => (
                    <tr key={r.date} className="border-b border-border/60 last:border-0">
                      <td className="px-4 py-2 font-medium">{dayFmt.format(new Date(`${r.date}T00:00:00`))}</td>
                      <td className="px-4 py-2 text-right">{nf.format(r.impressions)}</td>
                      <td className="px-4 py-2 text-right">{nf.format(r.clicks)}</td>
                      <td className="px-4 py-2 text-right">{r.ctr.toFixed(2)}%</td>
                      <td className="px-4 py-2 text-right">{nf.format(r.leads)}</td>
                      <td className="px-4 py-2 text-right">{r.leads > 0 ? formatMoney(r.cpl, r.currency) : ""}</td>
                      <td className="px-4 py-2 text-right">{formatMoney(r.spend, r.currency)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassPanel>
        </>
      )}
    </div>
  );
}
