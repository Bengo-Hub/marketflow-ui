import { apiClient } from "./client";
import type { Paginated } from "./types";

/** Events the worker enrols leads and contacts on (marketflow-api worker consumers). */
export const SEQUENCE_TRIGGERS = [
  { value: "lead.created", label: "When a new lead arrives" },
  { value: "contact.dormant", label: "When a customer goes quiet" },
] as const;

export const STEP_CHANNELS = ["whatsapp", "sms", "email"] as const;

/** Placeholders the worker fills in step text ({{first_name}} and so on, worker/template_vars.go). */
export const TEMPLATE_VARS = [
  "first_name", "last_name", "full_name", "fbo_name", "whatsapp_link", "profile_link", "shop_link", "product_link", "join_link",
] as const;

/** One message of a sequence, as the worker reads it. */
export interface SequenceStep {
  delay_hours: number;
  channel: (typeof STEP_CHANNELS)[number];
  subject?: string;
  body?: string;
  template?: string;
}

export interface Sequence {
  id: string;
  name: string;
  trigger_event: string;
  lead_type_filter?: string | null;
  active: boolean;
  steps: SequenceStep[];
  total_enrolled: number;
  total_completed: number;
  created_at: string;
}

export interface SequenceInput {
  name: string;
  trigger_event: string;
  lead_type_filter?: string;
  active?: boolean;
  steps: SequenceStep[];
}

/** GET /sequences/{id}/analytics: enrolment outcomes. */
export interface EnrollmentStats {
  total_enrolled: number;
  active: number;
  completed: number;
  dropped: number;
  completion_rate: number;
}

/** GET /analytics/sequences/{id}: delivery events reported by notifications-api. */
export interface DeliveryStats {
  counts: Record<string, number>;
  enrollments?: Record<string, number>;
  [k: string]: unknown;
}

export const sequencesApi = {
  list: (page: number, limit = 50) => apiClient.get<Paginated<Sequence>>("/api/v1/sequences", { params: { page, limit } }).then((r) => r.data),
  create: (data: SequenceInput) => apiClient.post<Sequence>("/api/v1/sequences", data).then((r) => r.data),
  update: (id: string, data: Partial<SequenceInput>) => apiClient.put<Sequence>(`/api/v1/sequences/${id}`, data).then((r) => r.data),
  enrollments: (id: string) => apiClient.get<EnrollmentStats>(`/api/v1/sequences/${id}/analytics`).then((r) => r.data),
  delivery: (id: string) => apiClient.get<DeliveryStats>(`/api/v1/analytics/sequences/${id}`).then((r) => r.data),
};
