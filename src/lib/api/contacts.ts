import { apiClient } from "./client";
import type { Activity } from "./activities";
import type { Paginated } from "./types";

export const CONTACT_TYPES = ["customer", "prospect", "recruit", "downline"] as const;
export const LIFECYCLE_STAGES = ["subscriber", "lead", "prospect", "customer", "evangelist"] as const;

/** A contact (marketflow-api ent.Contact). MarketFlow is the customer record of the whole platform. */
export interface Contact {
  id: string;
  email?: string | null;
  phone?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  contact_type: string;
  lifecycle_stage?: string;
  lead_id?: string | null;
  flp_customer_id?: string | null;
  total_cc?: number;
  total_orders?: number;
  last_order_at?: string | null;
  account_id?: string | null;
  product_interests?: string[];
  subscribed_email?: boolean;
  subscribed_sms?: boolean;
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at?: string;
}

export interface ContactUpdate {
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  contact_type?: string;
  subscribed_email?: boolean;
  subscribed_sms?: boolean;
}

export interface Contact360 {
  contact: Contact;
  open_deals: Array<{ id: string; title: string; value?: number; currency?: string }>;
  won_deals: Array<{ id: string; title: string; value?: number; currency?: string }>;
  activities: Activity[];
  open_tasks: Array<{ id: string; title: string; due_at?: string | null }>;
  meetings: Array<{ id: string; meeting_type: string; scheduled_at: string; status: string }>;
  nurture_active: Array<{ id: string; sequence_id: string; current_step: number }>;
  order_summary?: Record<string, unknown>;
  payment_summary?: Record<string, unknown>;
  loyalty_summary?: Record<string, unknown>;
}

export interface ImportRow {
  external_ref: string;
  email?: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  contact_type?: string;
}

export interface ImportResult {
  created: number;
  existing: number;
  failed: number;
  results: Array<{ external_ref: string; contact_id: string; status: "created" | "existing" | "failed"; error?: string }>;
}

/** Server limit is 1,000 rows per request (contacts.MaxBulkImportRows); send smaller chunks. */
export const IMPORT_CHUNK = 500;

export const contactsApi = {
  list: (params: { q?: string; contact_type?: string }, page: number, limit = 20) =>
    apiClient
      .get<Paginated<Contact>>("/api/v1/contacts", {
        params: Object.fromEntries(Object.entries({ ...params, page, limit }).filter(([, v]) => v !== undefined && v !== "" && v !== "all")),
      })
      .then((r) => r.data),
  get: (id: string) => apiClient.get<Contact>(`/api/v1/contacts/${id}`).then((r) => r.data),
  // Go encodes empty slices as null; every list here is normalised to [].
  view360: (id: string) =>
    apiClient.get<Contact360>(`/api/v1/contacts/${id}/360`).then(({ data: d }) => ({
      ...d,
      open_deals: d.open_deals ?? [],
      won_deals: d.won_deals ?? [],
      activities: d.activities ?? [],
      open_tasks: d.open_tasks ?? [],
      meetings: d.meetings ?? [],
      nurture_active: d.nurture_active ?? [],
    })),
  update: (id: string, body: ContactUpdate) => apiClient.put<Contact>(`/api/v1/contacts/${id}`, body).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/api/v1/contacts/${id}`),
  merge: (survivorId: string, duplicateIds: string[]) =>
    apiClient.post("/api/v1/contacts/merge", { survivor_id: survivorId, duplicate_ids: duplicateIds }).then((r) => r.data),
  importChunk: (rows: ImportRow[]) =>
    apiClient
      .post<ImportResult>("/api/v1/contacts/bulk-import", {
        contacts: rows.map((r) => ({ ...r, contact_type: r.contact_type || "customer" })),
      })
      .then((r) => r.data),
};

export function contactName(c: Pick<Contact, "first_name" | "last_name" | "email" | "phone">): string {
  const n = `${c.first_name ?? ""} ${c.last_name ?? ""}`.trim();
  return n || c.email || c.phone || "Unnamed contact";
}
