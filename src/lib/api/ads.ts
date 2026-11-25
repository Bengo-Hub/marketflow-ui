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
  /** Sent with the code when a boost needs WhatsApp confirmation (see BoostOtp). */
  otp_id?: string;
  otp_code?: string;
}

/**
 * A boost at or above the business's limit needs a code sent to the owner's verified WhatsApp
 * number: POST /boosts answers 428 {error: "otp_required", threshold_kes}, POST /boosts/otp with
 * the same body sends the code, and the boost is sent again with otp_id and otp_code.
 */
export interface BoostOtp {
  otp_id: string;
  expires_at: string;
  channel: "whatsapp";
  to_masked: string;
}

/** Wrong codes allowed before the owner must ask for a new one. */
export const MAX_OTP_TRIES = 3;

function errorOf(e: unknown): { status?: number; error?: unknown; threshold_kes?: unknown } {
  const r = (e as { response?: { status?: number; data?: { error?: unknown; threshold_kes?: unknown } } })?.response;
  return { status: r?.status, error: r?.data?.error, threshold_kes: r?.data?.threshold_kes };
}

/** The limit in KES when the boost needs a WhatsApp code first, else null. */
export function otpRequired(e: unknown): number | null {
  const r = errorOf(e);
  if (r.status !== 428 || r.error !== "otp_required") return null;
  return typeof r.threshold_kes === "number" ? r.threshold_kes : 0;
}

/** True when the owner has no verified WhatsApp number to send the code to. */
export function noVerifiedPhone(e: unknown): boolean {
  const r = errorOf(e);
  return r.status === 409 && r.error === "no_verified_phone";
}

/** True when the API turned the code down (wrong or expired). */
export function otpRejected(e: unknown): boolean {
  const s = errorOf(e).status;
  return s === 400 || s === 403;
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
  /** Sends the WhatsApp code for a boost over the limit; the body is the boost's own. */
  boostOtp: (b: BoostInput) => apiClient.post<BoostOtp>(`${base}/boosts/otp`, b).then((r) => r.data),
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

/*
 * Run ads (owner, 2026-11-24): one plan for Meta, Google Ads and TikTok for an approved video.
 * Contract: marketflow-api internal/modules/adsmanager/runads.go and runads_handler.go. Amounts are
 * whole units of the tenant's currency; account_daily and account_total are in the account's.
 */

export type RunPlatform = "meta" | "google" | "tiktok";
export type RunTierName = "low" | "recommended" | "high" | "custom";

/** What a budget buys, with where the number came from (runads.Estimate). */
export interface RunEstimate {
  metric: string;
  value: number;
  per: "day" | "week" | "run" | string;
  source: "platform" | "your_results" | "rule_of_thumb" | "competitors" | string;
  label: string;
}

export interface RunTier {
  name: RunTierName | string;
  daily: number;
  recommended?: boolean;
  source: string;
  label: string;
  estimates: RunEstimate[];
}

/** One thing the owner does. path is a MarketFlow page under /{orgSlug}; url is a provider page. */
export interface PlanStep {
  label: string;
  path?: string;
  url?: string;
  done?: boolean;
}

export interface FundingView {
  /** null when the provider does not show it. */
  can_spend: boolean | null;
  status: string;
  detail: string;
  /** In the account's currency. */
  shortfall?: number;
  link?: string;
}

export interface PlanAccount {
  connected_account_id: string;
  external_id: string;
  name: string;
  currency: string;
}

export interface PlatformPlan {
  platform: RunPlatform | string;
  enabled: boolean;
  /** automatic (Meta boost), api (Google Ads API, TikTok once approved) or guided. */
  mode: "automatic" | "api" | "guided" | string;
  account?: PlanAccount;
  tier: RunTierName | string;
  daily: number;
  days: number;
  total: number;
  account_daily?: number;
  account_total?: number;
  /** The same amounts in the business's own currency, shown beside (absent when the plan is in it). */
  local_daily?: number;
  local_total?: number;
  /** What ads on the platform spent this month; null when there is no data. */
  month_spend?: number | null;
  /** Says plainly when the platform has no past results. */
  results_note?: string;
  tiers: RunTier[];
  estimates: RunEstimate[];
  funding: FundingView;
  setup: PlanStep[];
  steps: PlanStep[];
  blockers: string[];
  notes: string[];
  launch_credits?: number;
}

export interface DaysHint {
  days: number;
  source: string;
  label: string;
}

export interface RunPlan {
  version_id: string;
  /** The ads currency (USD unless the platform or the business chose another). */
  currency: string;
  /** The business's own currency, shown beside (absent when the plan is already in it). */
  local_currency?: string;
  local_total?: number;
  notes?: string[];
  days: number;
  total_cap: number;
  total: number;
  platforms: PlatformPlan[];
  days_hint?: DaysHint;
  blockers: string[];
  ready: boolean;
  otp_required: boolean;
  fingerprint: string;
}

export interface PlatformChoice {
  platform: RunPlatform | string;
  enabled?: boolean;
  daily?: number;
  tier?: string;
}

/** The owner's changes to the default plan; anything left out keeps the default. */
export interface RunChoice {
  /** The currency the amounts below were typed in; the API converts if the plan is in another. */
  currency?: string;
  days?: number;
  total_cap?: number;
  platforms?: PlatformChoice[];
}

export interface RunAdsInput extends RunChoice {
  version_id: string;
  fingerprint: string;
  otp_id?: string;
  otp_code?: string;
}

export interface PlatformResult {
  platform: RunPlatform | string;
  /** created, guided, failed or skipped. */
  status: "created" | "guided" | "failed" | "skipped" | string;
  campaign_id?: string;
  external_id?: string;
  message: string;
  steps?: PlanStep[];
}

export interface RunOutcome {
  results: PlatformResult[];
  plan: RunPlan | null;
  /** True when this plan had already been confirmed; nothing ran again. */
  replayed?: boolean;
  text: string;
}

export interface RunAdsOtp {
  otp_id: string;
  to_masked: string;
  expires_at: string;
  channel?: "whatsapp";
}

/** GET /api/v1/tenant/profile/run-ads view (runads.View). */
export interface RunAdsView {
  platforms: RunPlatform[];
  tier: "low" | "recommended" | "high";
  daily_budget: Partial<Record<RunPlatform, number>>;
  days: number;
  total_cap: number;
  /** True when the business set total_cap itself; its 0 is then no cap. */
  total_cap_set?: boolean;
  /** The ads currency plans are shown in. */
  currency?: string;
  /** What daily_budget and total_cap were saved in; empty is the business's own currency. */
  amounts_currency?: string;
  total_cap_kes?: number;
  rule_of_thumb_kes: Partial<Record<RunPlatform, Partial<Record<"low" | "recommended" | "high", number>>>>;
  tiktok_mode: "guided" | "api" | string;
}

export interface RunAdsSettingsResponse {
  platform: RunAdsView;
  effective: RunAdsView;
  /** Only the keys the tenant set itself. */
  tenant: Partial<RunAdsView>;
  /** The business's own currency. */
  currency: string;
  /** What the ads currency can be. */
  currencies?: string[];
  can_edit: boolean;
}

/** POST /ads/plan: the plan for an approved video with the owner's changes over the defaults. */
export function planRunAds(versionId: string, choice: RunChoice = {}) {
  return apiClient.post<RunPlan>(`${base}/plan`, { version_id: versionId, ...choice }).then((r) => r.data);
}

/**
 * POST /ads/run: confirms the plan the owner saw (its fingerprint). 201 ran it, 200 with replayed
 * means it had already run; 409 plan_changed or not_ready carry details.plan, 428 otp_required
 * needs a WhatsApp code (runAdsOTP), 422 otp_invalid is a wrong code.
 */
export function runAds(input: RunAdsInput) {
  return apiClient.post<RunOutcome>(`${base}/run`, input).then((r) => r.data);
}

/** POST /ads/run/otp: sends the WhatsApp code for the plan; the body is the run's own. */
export function runAdsOTP(input: RunAdsInput) {
  return apiClient.post<RunAdsOtp>(`${base}/run/otp`, input).then((r) => r.data);
}

/** POST /ads/run/{id}/done: the owner finished setting up a guided TikTok campaign. */
export function markTikTokDone(campaignId: string) {
  return apiClient.post<unknown>(`${base}/run/${encodeURIComponent(campaignId)}/done`).then((r) => r.data);
}

/** GET /tenant/profile/run-ads: the tenant's Run ads defaults beside the platform's. */
export function getRunAdsSettings() {
  return apiClient.get<RunAdsSettingsResponse>("/api/v1/tenant/profile/run-ads").then((r) => r.data);
}

/** A Run ads refusal: the HTTP status, the API's code and, for 409s, the fresh plan. */
export function runAdsError(e: unknown): { status?: number; code?: string; plan?: RunPlan } {
  const r = (e as { response?: { status?: number; data?: { code?: unknown; error?: unknown; details?: { plan?: RunPlan } } } })?.response;
  const code = typeof r?.data?.code === "string" ? r.data.code : typeof r?.data?.error === "string" ? r.data.error : undefined;
  return { status: r?.status, code, plan: r?.data?.details?.plan };
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
