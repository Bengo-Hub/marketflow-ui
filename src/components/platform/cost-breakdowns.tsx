"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { DataTableColumn } from "@bengo-hub/shared-ui-lib/data-table";
import { GlassPanel, ListTable, StatCard, humanize } from "@/components/ui-kit";
import { formatMoney } from "@/lib/api/campaigns";
import type { CostReport, CostReportDay, CostReportGroup } from "@/lib/api/platform-costs";
import { formatMargin } from "@/lib/platform-costs";

const usd = (n: number) => formatMoney(n, "USD");
const nf = new Intl.NumberFormat("en-KE");
// One validated hue, as the dashboard charts use.
const INK = "hsl(var(--chart-1))";
const GRID = "hsl(var(--border))";
const MUTED = "hsl(var(--muted-foreground))";

/** Provider cost per day or month: one series, so the panel title names it. */
function CostBars({ data, label }: { data: CostReportDay[]; label: string }) {
  const rows = data.map((d) => ({ day: d.day, cost: d.media_cost_usd }));
  return (
    <figure aria-label={label} className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => usd(v)} />
          <Tooltip cursor={{ fill: "hsl(var(--muted))" }} formatter={(v) => usd(Number(v))} />
          <Bar dataKey="cost" name="Provider cost" fill={INK} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </figure>
  );
}

function groupColumns(keyLabel: string, withCredits: boolean): DataTableColumn<CostReportGroup>[] {
  const cols: DataTableColumn<CostReportGroup>[] = [
    { key: "key", header: keyLabel, render: (r) => <span className="font-medium">{withCredits ? humanize(r.key) : r.key}</span> },
    { key: "versions", header: withCredits ? "Items" : "Scenes", render: (r) => <span className="tabular">{nf.format(r.versions)}</span> },
  ];
  if (withCredits) {
    cols.push(
      { key: "credits", header: "Credits used", render: (r) => <span className="tabular">{nf.format(r.credits_charged)}</span> },
      { key: "margin", header: "Margin", render: (r) => <span className="tabular">{formatMargin(r.margin)}</span> },
    );
  }
  cols.push({ key: "cost", header: "Provider cost", render: (r) => <span className="tabular">{usd(r.media_cost_usd)}</span> });
  return cols;
}

/** The cost report's breakdowns: the platform owner's own spend, the trends, features and routes. */
export function CostBreakdowns({ report }: { report: CostReport }) {
  const owner = report.platform_owner;
  return (
    <div className="space-y-6">
      {owner && (
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard label="Platform owner's own spend" value={usd(owner.media_cost_usd)} hint={`${nf.format(owner.versions)} items, no credits charged`} />
          <StatCard label="Provider cost, all businesses" value={usd(report.totals.media_cost_usd)} hint={`${nf.format(report.totals.credits_charged)} credits used`} />
          <StatCard
            label="Provider cost paid with credits"
            value={usd(Math.max(0, report.totals.media_cost_usd - owner.media_cost_usd))}
            hint="Everything but the platform owner's own work"
          />
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-2">
        <GlassPanel title="Provider cost by day" description="This month, in US dollars at provider prices.">
          <CostBars data={report.daily ?? []} label="Provider cost per day" />
        </GlassPanel>
        <GlassPanel title="Provider cost by month" description="The six months up to this one.">
          <CostBars data={report.monthly ?? []} label="Provider cost per month" />
        </GlassPanel>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-base font-semibold">By feature</h2>
          <ListTable<CostReportGroup> columns={groupColumns("Feature", true)} rows={report.by_feature ?? []} rowKey={(r) => r.key} />
        </div>
        <div>
          <h2 className="mb-3 font-display text-base font-semibold">By provider and model</h2>
          <ListTable<CostReportGroup> columns={groupColumns("Route", false)} rows={report.by_route ?? []} rowKey={(r) => r.key} />
        </div>
      </div>
    </div>
  );
}
