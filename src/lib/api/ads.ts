import { apiClient } from "./client";

/**
 * Paid ads on the client's own Meta ad account (Sprint 18). Ad money goes from the client to
 * Meta; MarketFlow charges only launch credits. Contract:
 * marketflow/docs/sprint-plans/sprint-18-meta-paid-ads-fund-and-launch.md.
 */

const base = "/api/v1/ads";

export type Funding = "card" | "prepaid" | "needs_funds" | "unknown";
export type Objective = "whatsapp" | "leads" | "traffic";

export interface AdAccount {
  connected_account_id: string;
  ad_account_id: string;
  name: string;
  currency?: string;
  active: boolean;
  problem?: string;
  funding?: Funding;
}

export interface AdQuote {
  currency: string;
  budget: number;
  days: number;
  balance: number;
  shortfall: number;
  funding: Funding;
  launch_credits: number;
  blockers?: string[];
  account_name: string;
  ad_account_id: string;
}

export interface BoostInput {
  ad_account_connected_id: string;
  budget: number;
  days: number;
  page_connected_id: string;
  asset_id: string;
  /** Up to two more approved videos run as more ads of the same boost (budget optimiser). */
  extra_asset_ids?: string[];
  objective: Objective;
  message: string;
  headline?: string;
  link?: string;
  /** Leads only: the business's privacy policy, shown on the Meta instant form. */
  privacy_url?: string;
  whatsapp_number?: string;
  countries?: string[];
  age_min?: number;
  age_max?: number;
}

export interface Boost {
  id: string;
  name: string;
  status: "launching" | "active" | "paused" | "failed";
  budget: number;
  currency: string;
  launch?: {
    stage: string;
    review_status?: string;
    review_reasons?: string[];
    error?: string;
    paid_confirmed?: boolean;
    /** The ad account's funding as last read on Meta while the boost waits for money (Sprint 18 L62). */
    funding_seen?: { funding: Funding; balance: number; shortfall: number; currency?: string; at: string };
  };
  quote?: AdQuote;
}

export const adsApi = {
  accounts: () => apiClient.get<{ data: AdAccount[] }>(`${base}/accounts`).then((r) => r.data.data),
  /** A KES ad account (Nairobi time) in the client's business portfolio, so Meta offers M-Pesa. */
  createKES: (b: { page_connected_id?: string; business_id?: string; name?: string }) =>
    apiClient.post<AdAccount>(`${base}/accounts/kes`, b).then((r) => r.data),
  quote: (b: { ad_account_connected_id: string; budget: number; days: number }) => apiClient.post<AdQuote>(`${base}/quote`, b).then((r) => r.data),
  boost: (b: BoostInput) => apiClient.post<Boost>(`${base}/boosts`, b).then((r) => r.data),
  get: (id: string) => apiClient.get<Boost>(`${base}/boosts/${id}`).then((r) => r.data),
  paid: (id: string) => apiClient.post<Boost>(`${base}/boosts/${id}/paid`).then((r) => r.data),
  pause: (id: string) => apiClient.post<Boost>(`${base}/boosts/${id}/pause`).then((r) => r.data),
  /** Switches a paused boost that went live back on at Meta. */
  resume: (id: string) => apiClient.post<Boost>(`${base}/boosts/${id}/resume`).then((r) => r.data),
};

/**
 * Where the client tops up on Meta: Meta's billing hub for the ad account. The URL is not in
 * Meta's API docs (see docs/integrations/meta-paid-ads-apis.md); change it here if Meta moves it.
 */
export function metaBillingURL(adAccountID: string) {
  return `https://business.facebook.com/billing_hub/payment_settings/?asset_id=${encodeURIComponent(adAccountID.replace(/^act_/, ""))}`;
}

/**
 * What is still to add on Meta: the shortfall from the last live check when there is one (it
 * moves as the client tops up), else the quote's shortfall, else the whole budget.
 */
export function liveShortfall(
  seen: { shortfall: number; funding: Funding } | undefined,
  quote: { shortfall: number; budget: number },
): number {
  if (seen && (seen.funding === "needs_funds" || seen.funding === "unknown") && seen.shortfall > 0) return seen.shortfall;
  return quote.shortfall || quote.budget;
}

/** "just now", "5 min ago", "2 h ago" for a check time. */
export function timeAgo(at: string, now: Date = new Date()): string {
  const mins = Math.floor((now.getTime() - new Date(at).getTime()) / 60000);
  if (!Number.isFinite(mins) || mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  return `${Math.floor(mins / 60)} h ago`;
}

export const STAGE_LABEL: Record<string, string> = {
  campaign: "Setting up on Meta",
  adset: "Setting up on Meta",
  video: "Sending the video to Meta",
  creative: "Building the ad",
  ad: "Building the ad",
  review: "Meta is reviewing the ad",
  funding: "Approved, waiting for the budget on Meta",
  live: "Running",
  failed: "Stopped",
};
