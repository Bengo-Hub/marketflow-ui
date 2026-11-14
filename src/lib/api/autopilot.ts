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
  /** approve_each (default) or auto_publish: publish after a veto window unless the owner cancels. */
  approval_mode?: "approve_each" | "auto_publish";
  /** The veto window in hours, for auto_publish. */
  veto_hours?: number;
}

/** Whether the tenant may use the veto window, and the terms it accepts. */
export interface AutoPublishStatus {
  plan_allows: boolean;
  terms_accepted: boolean;
  terms_version: string;
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

export const autopilotApi = {
  dryRun: (id: string) => apiClient.get<DryRun>(`${base}/custom/${id}/autopilot/dry-run`).then((r) => r.data),
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
  setAutoPublish: (body: { accept_terms?: boolean; hold_categories?: string[] }) =>
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
