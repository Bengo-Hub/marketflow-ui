/**
 * Run ads (owner, 2026-11-24): the pure parts of the Run ads dialog and its Settings page. The
 * dialog keeps the owner's changes as a form, turns them into the Choice POST /ads/plan takes,
 * and shows every estimate with where its number comes from. The Settings page saves only the
 * keys marketflow-api accepts under metadata.run_ads (platforms, tier, daily_budget, days,
 * total_cap); it refuses any other key.
 */
import { formatBudget } from "@/lib/money";
import type { PlatformChoice, RunAdsView, RunChoice, RunEstimate, RunPlatform } from "@/lib/api/ads";

export const RUN_PLATFORMS: RunPlatform[] = ["meta", "google", "tiktok"];

export const PLATFORM_LABEL: Record<string, string> = {
  meta: "Meta (Facebook and Instagram)",
  google: "Google Ads",
  tiktok: "TikTok",
};

export const TIER_LABEL: Record<string, string> = {
  low: "Low",
  recommended: "Recommended",
  high: "High",
  custom: "Your own amount",
};

/** The fixed source labels; an estimate's own label wins when the API sends one. */
export const SOURCE_LABEL: Record<string, string> = {
  your_results: "From your own past results",
  rule_of_thumb: "MarketFlow rule of thumb (platform settings), not an estimate",
  competitors: "From your competitor ad scan",
};

const PLATFORM_SOURCE_LABEL: Record<string, string> = {
  meta: "Meta delivery estimate",
  google: "Google Ads budget recommendation",
  tiktok: "TikTok estimate",
};

/** Where a number comes from, as the owner reads it. */
export function sourceLabel(source: string, label: string | undefined, platform?: string): string {
  if (label && label.trim()) return label.trim();
  if (source === "platform") return PLATFORM_SOURCE_LABEL[platform ?? ""] ?? "The ad platform's own estimate";
  return SOURCE_LABEL[source] ?? "Source not given";
}

const METRIC_LABEL: Record<string, string> = {
  reach: "people reached",
  impressions: "impressions",
  clicks: "clicks",
  conversions: "conversions",
  leads: "leads",
  conversations: "conversations",
};

const PER_LABEL: Record<string, string> = {
  day: "per day",
  week: "per week",
  run: "over the whole run",
};

/** "About 1,200 people reached per day". */
export function estimateText(e: RunEstimate): string {
  const metric = METRIC_LABEL[e.metric] ?? e.metric.replace(/_/g, " ");
  const per = PER_LABEL[e.per] ?? `per ${e.per}`;
  return `About ${Math.round(e.value).toLocaleString("en-KE")} ${metric} ${per}`;
}

/** "About 1,200 people reached per day (Meta delivery estimate)". */
export function estimateLine(e: RunEstimate, platform?: string): string {
  return `${estimateText(e)} (${sourceLabel(e.source, e.label, platform)})`;
}

/** How a platform's ads get made, in the owner's words. */
export function modeLabel(mode: string, platform?: string): string {
  if (mode === "automatic") return "Automatic";
  if (mode === "api") return platform === "google" ? "Created for you through the Google Ads API" : "Created for you through the platform's API";
  if (mode === "guided") return "Guided: you set it up with these links";
  return mode;
}

/** The owner's changes in the dialog; anything unset keeps the plan's default. */
export interface PlatformForm {
  enabled?: boolean;
  /** A tier chip (low, recommended, high). */
  tier?: string;
  /** An amount the owner typed, whole units of the plan currency. */
  daily?: number;
}

export interface RunAdsForm {
  days?: number;
  /** 0 is no cap; undefined keeps the default. */
  totalCap?: number;
  platforms: Partial<Record<string, PlatformForm>>;
}

export const EMPTY_FORM: RunAdsForm = { platforms: {} };

/**
 * The Choice for POST /ads/plan and /ads/run. A typed amount replaces the tier; a tier is sent
 * only without one. Platforms with nothing changed are left out.
 */
export function buildChoice(form: RunAdsForm): RunChoice {
  const out: RunChoice = {};
  if (form.days !== undefined && Number.isInteger(form.days) && form.days >= 1 && form.days <= 90) out.days = form.days;
  if (form.totalCap !== undefined && Number.isFinite(form.totalCap) && form.totalCap >= 0) out.total_cap = Math.round(form.totalCap);
  const platforms: PlatformChoice[] = [];
  for (const p of RUN_PLATFORMS) {
    const f = form.platforms[p];
    if (!f) continue;
    const c: PlatformChoice = { platform: p };
    if (f.enabled !== undefined) c.enabled = f.enabled;
    if (f.daily !== undefined && f.daily > 0) c.daily = Math.round(f.daily);
    else if (f.tier && f.tier !== "custom") c.tier = f.tier;
    if (Object.keys(c).length > 1) platforms.push(c);
  }
  if (platforms.length) out.platforms = platforms;
  return out;
}

/** "Confirm and run ads: KES 21,000". */
export function confirmLabel(total: number, currency: string): string {
  return `Confirm and run ads: ${formatBudget(total, currency)}`;
}

/** The Settings form; daily_budget values of 0 or null mean "use the tier". */
export interface RunAdsSettingsForm {
  platforms: RunPlatform[];
  tier: "low" | "recommended" | "high";
  daily_budget: Partial<Record<RunPlatform, number | null>>;
  days: number;
  total_cap: number;
}

export type RunAdsPatch = Partial<{
  platforms: RunPlatform[];
  tier: "low" | "recommended" | "high";
  daily_budget: Partial<Record<RunPlatform, number>>;
  days: number;
  total_cap: number;
}>;

/**
 * metadata.run_ads for PATCH /tenant/profile: only the values that differ from the platform
 * defaults, so a later change to a default still reaches the tenant, and only the five keys the
 * API accepts. null when everything matches (clears the tenant's overrides).
 */
export function runAdsPatch(v: RunAdsSettingsForm, platform: RunAdsView): RunAdsPatch | null {
  const out: RunAdsPatch = {};
  const ordered = RUN_PLATFORMS.filter((p) => v.platforms.includes(p));
  const platformOn = RUN_PLATFORMS.filter((p) => platform.platforms.includes(p));
  if (ordered.join() !== platformOn.join()) out.platforms = ordered;
  if (v.tier !== platform.tier) out.tier = v.tier;
  const daily: Partial<Record<RunPlatform, number>> = {};
  for (const p of RUN_PLATFORMS) {
    const n = v.daily_budget[p];
    if (typeof n === "number" && Number.isFinite(n) && n > 0) daily[p] = Math.round(n);
  }
  if (Object.keys(daily).length) out.daily_budget = daily;
  if (v.days !== platform.days) out.days = v.days;
  if (v.total_cap > 0) out.total_cap = Math.round(v.total_cap);
  return Object.keys(out).length ? out : null;
}

/** What stops the Settings form from saving. */
export function runAdsSettingsProblems(v: RunAdsSettingsForm): string[] {
  const out: string[] = [];
  if (v.platforms.length === 0) out.push("Switch on at least one platform.");
  if (!Number.isInteger(v.days) || v.days < 1 || v.days > 90) out.push("Days must be a whole number from 1 to 90.");
  if (!Number.isFinite(v.total_cap) || v.total_cap < 0) out.push("The total cap must be 0 or more.");
  return out;
}
