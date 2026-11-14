import { apiClient } from "./client";

/** GET /api/v1/analytics/dashboard (marketflow-api analytics.DashboardData). */
export interface DashboardData {
  leads: {
    total: number;
    this_week: number;
    prev_week: number;
    delta_percent: number;
    converted: number;
    conversion_rate: number;
    in_window: number;
  };
  chat_sessions: { this_week: number };
  campaigns: { active: number };
  meetings: { upcoming_week: number };
  nurture: { active_enrollments: number };
  days: number;
  daily: Array<{ day: string; count: number }>;
  by_source: Array<{ source: string; count: number }>;
  generated_at: string;
}

/** GET /api/v1/analytics/profile: public page events over the last `days` days. */
export interface ProfileMetrics {
  days: number;
  counts: Partial<Record<"page_view" | "cta_click" | "whatsapp_click" | "chat_open" | "book_click" | "product_click" | "testimonial_view", number>>;
  unique_visitors: number;
  total_events: number;
}

export type DashboardDays = 7 | 30 | 90;

/** One campaign in GET /api/v1/analytics/roi (marketflow-api analytics.CampaignROI). */
export interface CampaignROI {
  campaign_id: string;
  name: string;
  platform?: string;
  currency: string;
  spend: number;
  leads: number;
  converted: number;
  won_deals: number;
  revenue: number;
  estimated_revenue: number;
  cost_per_lead?: number;
  roi_percent?: number;
  roas?: number;
}

/** GET /api/v1/analytics/roi: what each campaign brought back for leads that arrived in the window. */
export interface ROIReport {
  days: number;
  currency: string;
  average_sale_value: number;
  average_from: "setting" | "won_deals" | "none";
  campaigns: CampaignROI[];
  totals: Omit<CampaignROI, "campaign_id" | "name" | "platform" | "currency">;
  generated_at: string;
}

export type ReportFormat = "pdf" | "xlsx" | "csv";

export const analyticsApi = {
  // Go encodes an empty slice as null; normalise so pages can read .length safely.
  dashboard: (days: DashboardDays) =>
    apiClient
      .get<DashboardData>("/api/v1/analytics/dashboard", { params: { days } })
      .then((r) => ({ ...r.data, daily: r.data.daily ?? [], by_source: r.data.by_source ?? [] })),
  profile: (days: DashboardDays) =>
    apiClient.get<ProfileMetrics>("/api/v1/analytics/profile", { params: { days } }).then((r) => r.data),
  roi: (days: DashboardDays) =>
    apiClient
      .get<ROIReport>("/api/v1/analytics/roi", { params: { days } })
      .then((r) => ({ ...r.data, campaigns: r.data.campaigns ?? [] })),
  /** The marketing report as a file: PDF, Excel or CSV (Sprint 7 #51). */
  report: (days: DashboardDays, format: ReportFormat) =>
    apiClient.get<Blob>("/api/v1/analytics/report", { params: { days, format }, responseType: "blob" }).then((r) => r.data),
};
