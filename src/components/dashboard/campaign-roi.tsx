"use client";

import Link from "next/link";
import { Megaphone } from "lucide-react";
import type { DataTableColumn } from "@bengo-hub/shared-ui-lib/data-table";
import { EmptyState, ErrorState, GlassPanel, ListTable } from "@/components/ui-kit";
import { useCampaignROI } from "@/hooks/use-analytics";
import { formatMoney } from "@/lib/api/campaigns";
import type { CampaignROI, DashboardDays, ROIReport } from "@/lib/api/analytics";

const nf = new Intl.NumberFormat("en-KE");

/** "+150%" or "-20%"; empty without spend. */
export function returnLabel(pct: number | undefined): string {
  if (pct === undefined || !isFinite(pct)) return "";
  const r = Math.round(pct);
  return r > 0 ? `+${r}%` : `${r}%`;
}

/** How estimated revenue was worked out, in the owner's words. */
export function averageNote(r: Pick<ROIReport, "average_from" | "average_sale_value" | "currency">): string {
  switch (r.average_from) {
    case "setting":
      return `Converted leads without a won deal count at your average sale value of ${formatMoney(r.average_sale_value, r.currency)}.`;
    case "won_deals":
      return `Converted leads without a won deal count at ${formatMoney(r.average_sale_value, r.currency)}, the average of your won deals over the last 180 days.`;
    default:
      return "Only won deals count. Set an average sale value to count converted leads too.";
  }
}

/** Sprint 7 #54: what each campaign brought back against what it cost. */
export function CampaignROIPanel({ orgSlug, days }: { orgSlug: string; days: DashboardDays }) {
  const roi = useCampaignROI(days);
  const r = roi.data;
  const num = (key: keyof CampaignROI & string, header: string, fmt: (c: CampaignROI) => string) =>
    ({ key, header, align: "right", sortable: true, accessor: (c: CampaignROI) => c[key] ?? 0, render: (c: CampaignROI) => <span className="tabular">{fmt(c)}</span> }) as DataTableColumn<CampaignROI>;
  const columns: DataTableColumn<CampaignROI>[] = [
    {
      key: "name",
      header: "Campaign",
      primary: true,
      sortable: true,
      accessor: (c) => c.name,
      render: (c) => (
        <Link href={`/${orgSlug}/campaigns/${c.campaign_id}`} className="font-medium hover:underline">
          {c.name}
        </Link>
      ),
    },
    num("spend", "Spend", (c) => formatMoney(c.spend, c.currency)),
    num("leads", "Leads", (c) => nf.format(c.leads)),
    num("cost_per_lead", "Per lead", (c) => (c.cost_per_lead !== undefined ? formatMoney(c.cost_per_lead, c.currency) : "")),
    num("won_deals", "Won", (c) => nf.format(c.won_deals)),
    num("estimated_revenue", "Est. revenue", (c) => formatMoney(c.estimated_revenue, c.currency)),
    num("roi_percent", "Return", (c) => returnLabel(c.roi_percent)),
  ];

  return (
    <GlassPanel
      title="Return on campaigns"
      description={r ? `Leads from the last ${r.days} days and the deals they closed. ${averageNote(r)}` : undefined}
      actions={
        <Link href={`/${orgSlug}/settings/reports`} className="text-sm font-semibold text-primary hover:underline">
          Average sale value
        </Link>
      }
    >
      {roi.isError ? (
        <ErrorState message="Could not work out the campaign return." onRetry={() => void roi.refetch()} />
      ) : !roi.isLoading && r && r.campaigns.length === 0 ? (
        <EmptyState
          icon={<Megaphone />}
          title="No campaign leads in this period"
          description="Campaign returns show here once a campaign brings in leads or spends on ads."
        />
      ) : (
        <ListTable<CampaignROI>
          columns={columns}
          rows={r?.campaigns ?? []}
          rowKey={(c) => c.campaign_id}
          loading={roi.isLoading}
          defaultSort={{ key: "estimated_revenue", dir: "desc" }}
        />
      )}
    </GlassPanel>
  );
}
