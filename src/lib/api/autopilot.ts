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

export const autopilotApi = {
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
};

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
