import { apiClient } from "./client";

/**
 * Ad autopilot (Sprint 20): agents that draft ads on a schedule, inside limits the owner sets. A
 * run ends at a draft in the Studio; nothing is posted or paid for until a person approves it.
 * Contract: marketflow/docs/sprint-plans/sprint-20-content-autopilot.md.
 */

const base = "/api/v1/agents";

export interface AutopilotConfig {
  offering_ids: string[];
  objective: "whatsapp" | "leads" | "traffic";
  languages: string[];
  video_tiers: string[];
  cadence: "daily" | "weekly";
  weekday: number;
  time: string;
  platforms: string[];
  connected_account_ids: string[];
  monthly_credit_ceiling: number;
  new_item_drafts?: boolean;
  /** One extra draft a day when a review rated 4 or 5 (or unrated) is published. */
  testimonial_drafts?: boolean;
  /** approve_each (default) or auto_publish: publish after a veto window unless the owner cancels. */
  approval_mode?: "approve_each" | "auto_publish";
  /** The veto window in hours, for auto_publish. */
  veto_hours?: number;
  /** Paid agents: each run first checks the Meta ad account can fund per_ad_budget for period_days. */
  paid?: boolean;
  per_ad_budget?: number;
  period_days?: number;
  monthly_ad_ceiling?: number;
  /** The CPL stop: boosts of this agent's videos pause when a lead costs more than this. 0 or unset is off. */
  stop_cpl?: number;
  /** The days the CPL stop judges, today included (1 to 14, default 3). */
  stop_cpl_days?: number;
  end_date?: string;
}

/** The CPL stop's window limits, as the API checks them. */
export const STOP_CPL_DEFAULT_DAYS = 3;
export const STOP_CPL_MAX_DAYS = 14;

/** Clamps the CPL stop's window to 1..14 days; anything unreadable is the default. */
export function clampStopDays(days: number): number {
  if (!Number.isFinite(days) || days < 1) return STOP_CPL_DEFAULT_DAYS;
  return Math.min(Math.round(days), STOP_CPL_MAX_DAYS);
}

/** The longest run of one paid ad, as the API checks it (MaxPeriodDays). */
export const MAX_PERIOD_DAYS = 90;

/** The paid budget and end date of an agent, as the settings form holds them. */
export interface PaidBudget {
  paid: boolean;
  per_ad_budget: number;
  period_days: number;
  monthly_ad_ceiling: number;
  /** YYYY-MM-DD, or "" for none. */
  end_date: string;
}

/** True for a real calendar day written YYYY-MM-DD, the only form the API reads. */
export function isISODate(s: string): boolean {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const t = new Date(Date.UTC(y, mo - 1, d));
  return t.getUTCFullYear() === y && t.getUTCMonth() === mo - 1 && t.getUTCDate() === d;
}

/**
 * The problems the API's AutopilotConfig.Validate would refuse in the paid budget and the end
 * date, in the same order, so the form can say so before saving. Budgets are whole amounts in the
 * ad account's currency (the API reads them as integers). Empty means it would be accepted.
 */
export function paidBudgetProblems(b: PaidBudget): string[] {
  const out: string[] = [];
  if (b.paid) {
    if (!(b.per_ad_budget > 0) || !(b.monthly_ad_ceiling > 0)) {
      out.push("A paid agent needs a budget per ad and a monthly ad ceiling.");
    } else if (!Number.isInteger(b.per_ad_budget) || !Number.isInteger(b.monthly_ad_ceiling)) {
      out.push("Use whole amounts for the budget per ad and the monthly ad ceiling.");
    } else if (b.per_ad_budget > b.monthly_ad_ceiling) {
      out.push("The budget per ad is above the monthly ad ceiling.");
    }
    if (!Number.isInteger(b.period_days) || b.period_days < 1 || b.period_days > MAX_PERIOD_DAYS) {
      out.push(`Each ad runs for 1 to ${MAX_PERIOD_DAYS} days.`);
    }
  }
  if (b.end_date !== "" && !isISODate(b.end_date)) {
    out.push("The end date must be a real date.");
  }
  return out;
}

/** Whether the tenant may use the veto window, and the terms it accepts. */
export interface AutoPublishStatus {
  plan_allows: boolean;
  terms_accepted: boolean;
  /** auth-api's terms could not be read just now: nothing auto-publishes and nothing is cancelled for it. */
  terms_unknown?: boolean;
  terms_version: string;
  /** True when terms_version is a version published in auth-api (owner 2026-11-14). */
  terms_document?: boolean;
  /** The full terms for terms_version on the accounts site, when published. */
  terms_url?: string;
  /** When terms_version applies (RFC 3339), when a date is set. */
  terms_effective_at?: string;
  /**
   * The tenant runs on an earlier accepted version until terms_effective_at. Owner 2026-11-14: it
   * should accept the new terms before then, or its waiting posts are cancelled and every video
   * waits for approval.
   */
  new_terms_pending?: boolean;
  accepted_at?: string;
  can_auto_publish: boolean;
  hold_categories: string[];
  terms: string[];
  default_veto_hours: number;
  min_veto_hours: number;
  max_veto_hours: number;
}

/** One scheduled or finished post of a publishing job, as the calendar shows it. */
export interface VetoJob {
  id: string;
  connected_account_id?: string;
  platform: string;
  status: string;
  planned_at: string;
  permalink?: string;
}

/** An agent's video in veto-window mode, for the dashboard. */
export interface AutopilotPost {
  version_id: string;
  brief_id: string;
  agent_id: string;
  agent_name?: string;
  offering: string;
  caption?: string;
  /** active | scheduled | held | vetoed | released | failed | handed_over */
  state: string;
  reason?: string;
  status: string;
  publish_at?: string;
  veto_hours?: number;
  decision?: { outcome?: string; by?: string; at?: string };
  jobs?: VetoJob[];
}

export interface VetoResult {
  state: string;
  cancelled: number;
  message: string;
}

export interface ConfigVersion {
  version: number;
  saved_at: string;
  config: AutopilotConfig;
}

export interface AutopilotAgent {
  id: string;
  name: string;
  is_active: boolean;
  last_run_at?: string;
  metadata?: {
    kind?: string;
    autopilot?: AutopilotConfig;
    autopilot_offerings?: Array<Record<string, unknown>>;
    versions?: ConfigVersion[];
  };
}

export interface AgentTemplate {
  id: string;
  name: string;
  description: string;
  kind: string;
  category: string;
  version: number;
}

export interface AgentRun {
  id: string;
  status: string;
  error_message?: string;
  trace?: { skip?: string };
  triggered_by?: string;
  started_at?: string;
  finished_at?: string;
}

/** A draft of the agent's waiting for the owner: a script to review or a finished ad to approve. */
export interface PendingDraft {
  version_id: string;
  brief_id: string;
  title: string;
  kind: string;
  status: string;
  created_at: string;
  updated_at: string;
}

/** The agent's last seven days, the same numbers as the weekly email. Spend is in the ad account's currency. */
export interface AutopilotWeek {
  since: string;
  ads_made: number;
  credits: number;
  spend: number;
  leads: number;
  cpl: number;
}

/** GET /agents/custom/{id}/autopilot/dashboard. */
export interface AutopilotDashboard {
  pending: PendingDraft[];
  week: AutopilotWeek;
}

/** A preview of the next run and a month of runs. Nothing is made or charged. */
export interface DryRun {
  offering: string;
  language: string;
  tier: string;
  runs_per_month: number;
  credits_known: boolean;
  script_credits: number;
  render_credits: number;
  balance: number;
  monthly_draft_credits: number;
  monthly_full_credits: number;
  credit_ceiling: number;
  drafts_within_ceiling: number;
  ads_within_ceiling: number;
}

/**
 * The plan's Autopilot allowance (owner 2026-11-14): marketflow_autopilot from MarketFlow Lite up,
 * max_autopilot_agents switched on at once (Lite 1, Growth 3, Pro 10, Business unlimited).
 */
export interface AutopilotPlan {
  included: boolean;
  /** The plan could not be read just now: nothing can be switched on until it can. */
  unknown?: boolean;
  /** The platform owner's tenant: no plan limits. */
  exempt?: boolean;
  /** -1 is unlimited. */
  limit: number;
  active: number;
  can_activate: boolean;
  /** Where the owner upgrades, for example /settings/billing. */
  upgrade_path: string;
}

/** A refusal from the plan gate: 403 autopilot_not_in_plan, 402 autopilot_limit_reached or 503 plan_unavailable. */
export interface AutopilotPlanRefusal {
  code: "autopilot_not_in_plan" | "autopilot_limit_reached" | "plan_unavailable";
  message: string;
  limit?: number;
  active?: number;
  upgradePath: string;
}

const planCodes = ["autopilot_not_in_plan", "autopilot_limit_reached", "plan_unavailable"];

/** Reads a plan refusal out of an API error, or null when the error is something else. */
export function autopilotPlanRefusal(err: unknown): AutopilotPlanRefusal | null {
  const data = (err as { response?: { data?: { code?: string; error?: string; details?: Record<string, unknown> } } })?.response?.data;
  if (!data?.code || !planCodes.includes(data.code)) return null;
  const d = data.details ?? {};
  return {
    code: data.code as AutopilotPlanRefusal["code"],
    message: data.error ?? "",
    limit: typeof d.limit === "number" ? d.limit : undefined,
    active: typeof d.active === "number" ? d.active : undefined,
    upgradePath: typeof d.upgrade_path === "string" ? d.upgrade_path : "/settings/billing",
  };
}

export const autopilotApi = {
  /** The plan's Autopilot allowance and how many agents are switched on. */
  plan: () => apiClient.get<AutopilotPlan>(`${base}/autopilot/plan`).then((r) => r.data),
  dryRun: (id: string) => apiClient.get<DryRun>(`${base}/custom/${id}/autopilot/dry-run`).then((r) => r.data),
  /** The agent's drafts waiting for the owner and its last seven days. */
  dashboard: (id: string) => apiClient.get<AutopilotDashboard>(`${base}/custom/${id}/autopilot/dashboard`).then((r) => r.data),
  /** The agent's latest runs, newest first. */
  runs: (id: string, limit = 10) =>
    apiClient.get<{ data: AgentRun[] | null }>(`${base}/custom/${id}/runs`, { params: { limit } }).then((r) => r.data.data ?? []),
  latestRun: (id: string) =>
    apiClient.get<{ data: AgentRun[] | null }>(`${base}/custom/${id}/runs`, { params: { limit: 1 } }).then((r) => r.data.data?.[0] ?? null),
  /** The tenant's agents that are ad autopilots. */
  list: () =>
    apiClient
      .get<{ data: AutopilotAgent[] | null }>(`${base}/custom`)
      .then((r) => (r.data.data ?? []).filter((a) => a.metadata?.kind === "ad_autopilot")),
  templates: () => apiClient.get<{ data: AgentTemplate[] | null }>(`${base}/templates`).then((r) => r.data.data ?? []),
  hire: (id: string) => apiClient.post<AutopilotAgent>(`${base}/templates/${id}/hire`).then((r) => r.data),
  create: (name: string) => apiClient.post<AutopilotAgent>(`${base}/custom`, { name, trigger_type: "manual" }).then((r) => r.data),
  save: (id: string, config: AutopilotConfig, offerings: Array<Record<string, unknown>>) =>
    apiClient.put<AutopilotAgent>(`${base}/custom/${id}/autopilot`, { config, offerings }).then((r) => r.data),
  rollback: (id: string, version: number) => apiClient.post<AutopilotAgent>(`${base}/custom/${id}/autopilot/rollback`, { version }).then((r) => r.data),
  setActive: (id: string, is_active: boolean) => apiClient.put<AutopilotAgent>(`${base}/custom/${id}`, { is_active }).then((r) => r.data),
  runNow: (id: string) => apiClient.post(`${base}/custom/${id}/run`).then((r) => r.data),
  autoPublish: () => apiClient.get<AutoPublishStatus>(`${base}/autopilot/auto-publish`).then((r) => r.data),
  /**
   * accept_terms records the acceptance (in auth-api once the terms are published there).
   * terms_version is the version the person read; a newer one answers 409 terms_changed.
   */
  setAutoPublish: (body: { accept_terms?: boolean; terms_version?: string; hold_categories?: string[] }) =>
    apiClient.put<AutoPublishStatus>(`${base}/autopilot/auto-publish`, body).then((r) => r.data),
  /** The agents' videos in veto-window mode, newest first. */
  posts: (agentId?: string) =>
    apiClient
      .get<{ data: AutopilotPost[] | null }>(`${base}/autopilot/posts`, { params: agentId ? { agent_id: agentId } : undefined })
      .then((r) => r.data.data ?? []),
  veto: (versionId: string) => apiClient.post<VetoResult>(`${base}/autopilot/posts/${versionId}/veto`).then((r) => r.data),
  /** Cancels the post on one account only; the other accounts still get it (owner 2026-11-14). */
  vetoJob: (versionId: string, jobId: string) =>
    apiClient.post<VetoResult>(`${base}/autopilot/posts/${versionId}/jobs/${jobId}/veto`).then((r) => r.data),
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The monthly AI credit ceiling the API accepts. */
export const CREDIT_CEILING_MIN = 1;
export const CREDIT_CEILING_MAX = 5000;

/** What is wrong with the monthly AI credit ceiling, or null. */
export function creditCeilingProblem(credits: number): string | null {
  if (!Number.isInteger(credits) || credits < CREDIT_CEILING_MIN || credits > CREDIT_CEILING_MAX) {
    return `Most AI credits a month is a whole number from ${CREDIT_CEILING_MIN} to ${CREDIT_CEILING_MAX.toLocaleString()}.`;
  }
  return null;
}
