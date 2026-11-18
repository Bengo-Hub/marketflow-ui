"use client";

import { useState } from "react";
import Link from "next/link";
import { Coins, DollarSign, Info, Layers, Percent, Receipt, Scale } from "lucide-react";
import type { DataTableColumn } from "@bengo-hub/shared-ui-lib/data-table";
import { CapsuleTabs, EmptyState, ErrorState, GlassPanel, ListTable, PageHeader, StatCard, ToneBadge } from "@/components/ui-kit";
import { usePlatformCostReport } from "@/hooks/use-platform-costs";
import { formatMoney } from "@/lib/api/campaigns";
import type { CostReportTenant } from "@/lib/api/platform-costs";
import { cn } from "@/lib/utils";
import {
  COST_REPORT_PAGE_SIZE,
  defaultMonth,
  floorLabel,
  formatMargin,
  isBelowFloor,
  marginTone,
  monthLabel,
  monthOptions,
} from "@/lib/platform-costs";

const nf = new Intl.NumberFormat("en-KE");
const usd = (n: number) => formatMoney(n, "USD");
const kes = (n: number) => formatMoney(n, "KES");

export default function PlatformCostsPage() {
  const [months] = useState(() => monthOptions(new Date(), 6));
  const [month, setMonth] = useState(() => defaultMonth());
  const [page, setPage] = useState(1);
  const report = usePlatformCostReport({ month, page, page_size: COST_REPORT_PAGE_SIZE });
  const d = report.data;
  const loading = report.isLoading;
  const floor = d?.margin_floor ?? 0;
  const totalsBelow = d ? isBelowFloor(d.totals.margin, floor, d.totals.below_floor) : false;
  const emptyMonth = !!d && d.totals.versions === 0 && d.tenants.length === 0;

  const pickMonth = (m: string) => {
    setMonth(m);
    setPage(1);
  };

  const columns: DataTableColumn<CostReportTenant>[] = [
    {
      key: "name",
      header: "Business",
      primary: true,
      accessor: (r) => r.name || r.slug,
      render: (r) => (
        <Link href={`/${r.slug}/dashboard`} className="font-medium hover:text-primary">
          {r.name || r.slug}
          <span className="block text-xs font-normal text-muted-foreground">{r.slug}</span>
        </Link>
      ),
    },
    { key: "versions", header: "Versions", align: "right", hideBelow: "md", accessor: (r) => r.versions, render: (r) => <span className="tabular">{nf.format(r.versions)}</span> },
    { key: "credits_charged", header: "Credits charged", align: "right", accessor: (r) => r.credits_charged, render: (r) => <span className="tabular">{nf.format(r.credits_charged)}</span> },
    { key: "credits_kes", header: "Credits (KES)", align: "right", hideBelow: "md", accessor: (r) => r.credits_kes, render: (r) => <span className="tabular">{kes(r.credits_kes)}</span> },
    { key: "media_cost_usd", header: "Cost (USD)", align: "right", hideBelow: "lg", accessor: (r) => r.media_cost_usd, render: (r) => <span className="tabular">{usd(r.media_cost_usd)}</span> },
    { key: "media_cost_kes", header: "Cost (KES)", align: "right", accessor: (r) => r.media_cost_kes, render: (r) => <span className="tabular">{kes(r.media_cost_kes)}</span> },
    {
      key: "margin",
      header: "Margin",
      align: "right",
      mobileAction: true,
      accessor: (r) => formatMargin(r.margin),
      render: (r) => {
        const below = isBelowFloor(r.margin, floor, r.below_floor);
        return (
          <span className="inline-flex flex-wrap items-center justify-end gap-2">
            <span className={cn("font-semibold tabular", below && "text-destructive")}>{formatMargin(r.margin)}</span>
            {below && <ToneBadge tone="danger">{floorLabel(floor)}</ToneBadge>}
          </span>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Scale />}
        title="Costs and margin"
        description="What each business was charged in credits against what its media cost us, per month."
      />

      <CapsuleTabs label="Pick a month" options={months} value={month} onChange={pickMonth} />

      {report.isError ? (
        <GlassPanel>
          <ErrorState message="Could not load the cost report." onRetry={() => void report.refetch()} />
        </GlassPanel>
      ) : emptyMonth ? (
        <GlassPanel>
          <EmptyState
            icon={<Receipt />}
            title={`Nothing charged in ${monthLabel(month)}`}
            description="No versions were made this month, so there are no credits or media costs to compare. Pick an earlier month above."
          />
        </GlassPanel>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Media cost"
              icon={<DollarSign />}
              loading={loading}
              value={d ? usd(d.totals.media_cost_usd) : "0"}
              hint={d && kes(d.totals.media_cost_kes)}
            />
            <StatCard
              label="Credits charged"
              icon={<Coins />}
              loading={loading}
              value={d ? nf.format(d.totals.credits_charged) : "0"}
              hint={d && `${kes(d.totals.credits_kes)} at ${kes(d.credit_value_kes)} a credit`}
            />
            <StatCard
              label="Versions made"
              icon={<Layers />}
              loading={loading}
              value={d ? nf.format(d.totals.versions) : "0"}
              hint={d && `${nf.format(d.pagination.total)} businesses`}
            />
            <StatCard
              label="Margin"
              icon={<Percent />}
              loading={loading}
              className={cn(totalsBelow && "border border-destructive/40 bg-destructive/10")}
              value={d ? <span className={cn(totalsBelow && "text-destructive")}>{formatMargin(d.totals.margin)}</span> : "-"}
              hint={
                d &&
                (totalsBelow ? (
                  <ToneBadge tone={marginTone(d.totals.margin, floor, d.totals.below_floor)}>{floorLabel(floor)}</ToneBadge>
                ) : (
                  `Floor is ${formatMargin(floor)}`
                ))
              }
            />
          </div>

          {d && (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0" />
              <span>
                US dollar costs are converted at {d.fx_kes_per_usd.toLocaleString("en-KE", { maximumFractionDigits: 4 })} KES per USD
                ({d.fx_source === "treasury" ? "live rate from treasury" : d.fx_source === "registry" ? "fallback rate from the service registry" : d.fx_source}).
                One credit is worth {kes(d.credit_value_kes)}.
              </span>
            </p>
          )}

          <div>
            <h2 className="mb-3 font-display text-base font-semibold">By business</h2>
            <ListTable<CostReportTenant>
              columns={columns}
              rows={d?.tenants ?? []}
              rowKey={(r) => r.tenant_id}
              loading={loading}
              paging={{ page, limit: d?.pagination.page_size || COST_REPORT_PAGE_SIZE, total: d?.pagination.total ?? 0, onPage: setPage }}
              emptyState={<EmptyState icon={<Receipt />} title="No businesses on this page" description="Go back a page to see businesses charged this month." />}
            />
          </div>

          {d && (
            <GlassPanel title="Not included" description="Costs this report does not count yet, so the true margin may be lower than shown.">
              {d.gaps.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
                  {d.gaps.map((g) => (
                    <li key={g}>{g}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">Every known cost is counted for this month.</p>
              )}
            </GlassPanel>
          )}
        </>
      )}
    </div>
  );
}
