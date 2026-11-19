import { apiClient } from "./client";

/**
 * The business's own Google Ads account (owner 2026-11-19): connected accounts, campaign results
 * and which Google Ads conversion action each MarketFlow event is sent to. Nothing is created or
 * spent on Google Ads from MarketFlow. Contract: marketflow-api internal/modules/googleads.
 */

const base = "/api/v1/ads/google";

export const GOOGLE_PERIODS = ["LAST_7_DAYS", "LAST_30_DAYS", "THIS_MONTH", "LAST_MONTH"] as const;
export type GooglePeriod = (typeof GOOGLE_PERIODS)[number];

export interface GoogleAdsAccount {
  connected_account_id: string;
  customer_id: string;
  name: string;
  currency?: string;
  status: string;
  test_account?: boolean;
  conversion_actions: Record<string, string>;
}

export interface GoogleCampaign {
  id: string;
  name: string;
  status: string;
  channel: string;
  impressions: number;
  clicks: number;
  conversions: number;
  cost: number;
}

export interface GoogleConversionAction {
  resource_name: string;
  name: string;
  status: string;
}

export const googleAdsApi = {
  accounts: () => apiClient.get<{ data: GoogleAdsAccount[] }>(`${base}/accounts`).then((r) => r.data.data ?? []),
  campaigns: (id: string, period: GooglePeriod) =>
    apiClient
      .get<{ data: GoogleCampaign[]; currency?: string }>(`${base}/accounts/${id}/campaigns`, { params: { period } })
      .then((r) => ({ rows: r.data.data ?? [], currency: r.data.currency })),
  conversionActions: (id: string) =>
    apiClient
      .get<{ data: GoogleConversionAction[]; events: string[]; mapping: Record<string, string> }>(`${base}/accounts/${id}/conversion-actions`)
      .then((r) => r.data),
  setMapping: (id: string, mapping: Record<string, string>) =>
    apiClient.put<GoogleAdsAccount>(`${base}/accounts/${id}/conversion-actions`, mapping).then((r) => r.data),
};

/** "LAST_30_DAYS" to "Last 30 days". */
export function periodLabel(p: string): string {
  const s = p.toLowerCase().replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}
