import { apiClient } from "./client";
import type { Paginated } from "./types";

export const CAMPAIGN_STATUSES = ["draft", "active", "paused", "completed", "failed"] as const;
export const CAMPAIGN_TYPES = ["lead_gen", "retargeting", "recruitment", "re_engagement"] as const;
export const CAMPAIGN_PLATFORMS = ["meta", "google", "manual"] as const;
export const CAMPAIGN_CHANNELS = ["email", "sms", "whatsapp"] as const;

/** A campaign (marketflow-api ent.Campaign). */
export interface Campaign {
  id: string;
  name: string;
  scope?: string;
  campaign_type?: string;
  platform: string;
  status: string;
  channel?: string;
  meta_campaign_id?: string | null;
  budget_daily?: number | null;
  budget_total?: number | null;
  currency?: string | null;
  funnel_id?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  metrics?: Record<string, number> | null;
  created_at: string;
}

export interface CampaignInput {
  name: string;
  campaign_type?: string;
  platform?: string;
  channel?: string;
  budget_daily?: number;
  budget_total?: number;
  currency?: string;
  funnel_id?: string;
  start_date?: string;
  end_date?: string;
}

/** GET /campaigns adds lead_counts (campaign id to attributed leads) to the page envelope. */
export type CampaignList = Paginated<Campaign> & { lead_counts?: Record<string, number> };

export interface CampaignMetrics {
  campaign_id: string;
  days: number;
  series: Array<{ date: string; impressions: number; clicks: number; leads: number; spend: number; ctr: number; cpl: number; currency: string }>;
  totals: { impressions: number; clicks: number; leads: number; spend: number; avg_ctr: number; avg_cpl: number; data_points: number };
}

export type SendSMSPayload = { segment_id: string; message: string };
/** The send becomes a broadcast in notifications-api that waits for approval in Broadcasts. */
export type SendSMSResult = { campaign_id: string; broadcast_id: string; status: string };

export const campaignsApi = {
  list: (params: { status?: string }, page: number, limit = 20) =>
    apiClient
      .get<CampaignList>("/api/v1/campaigns", { params: { ...(params.status && params.status !== "all" ? { status: params.status } : {}), page, limit } })
      .then((r) => r.data),
  get: (id: string) => apiClient.get<Campaign>(`/api/v1/campaigns/${id}`).then((r) => r.data),
  create: (data: CampaignInput) => apiClient.post<Campaign>("/api/v1/campaigns", data).then((r) => r.data),
  update: (id: string, data: Partial<CampaignInput>) => apiClient.put<Campaign>(`/api/v1/campaigns/${id}`, data).then((r) => r.data),
  /** Marks the campaign completed (the API keeps it for reporting). */
  remove: (id: string) => apiClient.delete(`/api/v1/campaigns/${id}`).then(() => undefined),
  pause: (id: string) => apiClient.post<Campaign>(`/api/v1/campaigns/${id}/pause`).then((r) => r.data),
  resume: (id: string) => apiClient.post<Campaign>(`/api/v1/campaigns/${id}/resume`).then((r) => r.data),
  metrics: (id: string, days = 30) =>
    apiClient.get<CampaignMetrics>(`/api/v1/analytics/campaigns/${id}`, { params: { days } }).then((r) => r.data),
  /**
   * Send a campaign SMS to a segment through notifications-api's broadcast engine (consent,
   * opt-outs, paced sends). The route carries the tenant UUID in the path
   * (POST /api/v1/{tenantID}/campaigns/{campaignID}/send-sms); without it the call was a 404.
   */
  sendSMS: (tenantId: string, campaignId: string, payload: SendSMSPayload) =>
    apiClient.post<SendSMSResult>(`/api/v1/${tenantId}/campaigns/${campaignId}/send-sms`, payload).then((r) => r.data),
};

export function formatMoney(amount: number | null | undefined, currency?: string | null): string {
  return new Intl.NumberFormat("en-KE", { style: "currency", currency: currency || "KES", maximumFractionDigits: 2 }).format(amount ?? 0);
}
