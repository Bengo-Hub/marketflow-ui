import { apiClient } from "./client";
import { costReportQueryString, type CostReportQuery } from "@/lib/platform-costs";

/** One month's charges against media cost, for every tenant or one row of the table. */
export interface CostReportLine {
  versions: number;
  credits_charged: number;
  credits_kes: number;
  media_cost_usd: number;
  media_cost_kes: number;
  /** (credits_kes - media_cost_kes) / credits_kes; null when nothing was charged. */
  margin: number | null;
  below_floor: boolean;
}

export interface CostReportTenant extends CostReportLine {
  tenant_id: string;
  name: string;
  slug: string;
}

/** GET /api/v1/admin/platform/cost-report (platform owner only). */
export interface CostReport {
  month: string;
  fx_kes_per_usd: number;
  fx_source: "treasury" | "registry" | string;
  credit_value_kes: number;
  margin_floor: number;
  totals: CostReportLine;
  tenants: CostReportTenant[];
  pagination: { page: number; page_size: number; total: number };
  /** Costs the report does not count yet, in plain words. */
  gaps: string[];
}

export const platformCostsApi = {
  report: (q: CostReportQuery) =>
    apiClient.get<CostReport>(`/api/v1/admin/platform/cost-report?${costReportQueryString(q)}`).then((r) => ({
      ...r.data,
      tenants: r.data.tenants ?? [],
      gaps: r.data.gaps ?? [],
    })),
};
