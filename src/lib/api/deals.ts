import { apiClient } from "./client";
import type { Paginated } from "./types";

/** A deal (marketflow-api ent.Deal). */
export interface Deal {
  id: string;
  title: string;
  contact_id?: string | null;
  lead_id?: string | null;
  account_id?: string | null;
  pipeline_id: string;
  stage_id: string;
  value?: number | null;
  currency: string;
  probability?: number | null;
  expected_close_date?: string | null;
  status: "open" | "won" | "lost" | string;
  lost_reason?: string | null;
  won_at?: string | null;
  lost_at?: string | null;
  created_at: string;
  updated_at?: string;
}

export interface DealInput {
  title: string;
  pipeline_id: string;
  stage_id: string;
  contact_id?: string;
  lead_id?: string;
  value?: number;
  currency: string;
  expected_close_date?: string;
}

export interface DealUpdate {
  title?: string;
  value?: number;
  currency?: string;
  expected_close_date?: string;
  probability?: number;
}

export const dealsApi = {
  list: (params: Record<string, string | number>) => apiClient.get<Paginated<Deal>>("/api/v1/deals", { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<Deal>(`/api/v1/deals/${id}`).then((r) => r.data),
  create: (data: DealInput) => apiClient.post<Deal>("/api/v1/deals", data).then((r) => r.data),
  update: (id: string, data: DealUpdate) => apiClient.put<Deal>(`/api/v1/deals/${id}`, data).then((r) => r.data),
  move: (id: string, stageId: string) => apiClient.post<Deal>(`/api/v1/deals/${id}/move`, { stage_id: stageId }).then((r) => r.data),
  markWon: (id: string) => apiClient.post<Deal>(`/api/v1/deals/${id}/won`).then((r) => r.data),
  /** The API field is "reason"; the old client sent "lost_reason", which the API rejected. */
  markLost: (id: string, reason?: string) => apiClient.post<Deal>(`/api/v1/deals/${id}/lost`, { reason }).then((r) => r.data),
};
