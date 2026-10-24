import { apiClient } from "./client";
import type { Paginated } from "./types";

/** Fields and operators marketflow-api's segment rules understand (modules/segments/rules.go). */
export const SEGMENT_FIELDS = {
  lifecycle_stage: { label: "Stage", ops: ["eq", "neq"], kind: "choice", choices: ["subscriber", "lead", "prospect", "customer", "evangelist"] },
  contact_type: { label: "Type", ops: ["eq", "neq"], kind: "choice", choices: ["customer", "prospect", "recruit", "downline"] },
  total_orders: { label: "Number of orders", ops: ["gte", "lte", "eq"], kind: "number" },
  last_order_at: { label: "Last order", ops: ["within_days", "older_than_days"], kind: "days" },
  created_at: { label: "Added", ops: ["within_days", "older_than_days"], kind: "days" },
  has_phone: { label: "Has a phone number", ops: ["eq"], kind: "bool" },
  has_email: { label: "Has an email", ops: ["eq"], kind: "bool" },
  subscribed_sms: { label: "Accepts marketing SMS", ops: ["eq"], kind: "bool" },
  subscribed_email: { label: "Accepts marketing email", ops: ["eq"], kind: "bool" },
} as const;

export type SegmentField = keyof typeof SEGMENT_FIELDS;
export const OP_LABEL: Record<string, string> = {
  eq: "is", neq: "is not", gte: "at least", lte: "at most", within_days: "within the last (days)", older_than_days: "more than (days) ago",
};

export interface SegmentCondition {
  field: SegmentField;
  op: string;
  value: string | number | boolean;
}

export interface SegmentRules {
  match: "all" | "any";
  conditions: SegmentCondition[];
}

export interface Segment {
  id: string;
  name: string;
  entity_type: "contact" | "lead" | string;
  filter_rules?: SegmentRules | null;
  is_dynamic: boolean;
  member_count?: number;
  last_calculated_at?: string | null;
  created_at: string;
}

export const segmentsApi = {
  list: () => apiClient.get<Paginated<Segment>>("/api/v1/segments", { params: { limit: 100 } }),
  create: (data: { name: string; entity_type: string; filter_rules: SegmentRules; is_dynamic: boolean }) =>
    apiClient.post<Segment>("/api/v1/segments", data).then((r) => r.data),
  update: (id: string, data: { name?: string; filter_rules?: SegmentRules; is_dynamic?: boolean }) =>
    apiClient.put<Segment>(`/api/v1/segments/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/api/v1/segments/${id}`).then(() => undefined),
  /** Recounts the members now. */
  evaluate: (id: string) => apiClient.post<Segment | { member_count: number }>(`/api/v1/segments/${id}/evaluate`).then((r) => r.data),
};
