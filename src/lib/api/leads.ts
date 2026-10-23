import { apiClient } from "./client";
import type { Paginated } from "./types";

export const LEAD_STATUSES = ["new", "contacted", "qualified", "converted", "lost"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

/** A lead as marketflow-api returns it (ent.Lead). */
export interface Lead {
  id: string;
  first_name?: string | null;
  last_name?: string | null;
  email?: string | null;
  phone?: string | null;
  source: string;
  lead_type: string;
  status: LeadStatus | string;
  score: number;
  interest?: string | null;
  campaign_id?: string | null;
  funnel_id?: string | null;
  utm_source?: string | null;
  utm_medium?: string | null;
  utm_campaign?: string | null;
  qualification_answers?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface LeadFilters {
  q?: string;
  status?: string;
  source?: string;
  lead_type?: string;
  from?: string;
  to?: string;
}

export interface LeadUpdate {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  status?: string;
  score?: number;
  interest?: string;
}

const clean = (f: LeadFilters) => Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== "" && v !== "all"));

export const leadsApi = {
  list: (filters: LeadFilters, page: number, limit = 20) =>
    apiClient.get<Paginated<Lead>>("/api/v1/leads", { params: { ...clean(filters), page, limit } }).then((r) => r.data),
  get: (id: string) => apiClient.get<Lead>(`/api/v1/leads/${id}`).then((r) => r.data),
  update: (id: string, body: LeadUpdate) => apiClient.put<Lead>(`/api/v1/leads/${id}`, body).then((r) => r.data),
  /** Every lead matching the filters, streamed by the server as CSV (no row cap). */
  exportCsv: (filters: LeadFilters) =>
    apiClient.get<Blob>("/api/v1/leads/export", { params: clean(filters), responseType: "blob" }).then((r) => r.data),
};

export function leadName(l: Pick<Lead, "first_name" | "last_name" | "email" | "phone">): string {
  const n = `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim();
  return n || l.email || l.phone || "Unnamed lead";
}
