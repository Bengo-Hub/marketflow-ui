import { apiClient } from "./client";
import type { Paginated } from "./types";

export type EntityType = "lead" | "contact" | "deal";

/** Types a person can log by hand; the rest are written by the system or other services. */
export const LOGGABLE_ACTIVITY_TYPES = ["note", "call", "email", "meeting", "sms", "whatsapp"] as const;

/** An activity row (marketflow-api ent.Activity). */
export interface Activity {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  activity_type: string;
  direction?: "inbound" | "outbound" | null;
  subject?: string | null;
  body?: string | null;
  outcome?: string | null;
  duration_minutes?: number | null;
  source?: string | null;
  external_ref?: string | null;
  performed_at?: string | null;
  created_at: string;
}

/** POST /api/v1/activities. The API rejects unknown fields, so only these keys may be sent. */
export interface ActivityInput {
  entity_type: EntityType;
  entity_id: string;
  activity_type: string;
  direction?: "inbound" | "outbound";
  subject?: string;
  body?: string;
  outcome?: string;
  duration_minutes?: number;
  performed_at?: string;
}

export const activitiesApi = {
  log: (data: ActivityInput) => apiClient.post<Activity>("/api/v1/activities", data).then((r) => r.data),
  list: (params?: Record<string, string | number>) =>
    apiClient.get<Paginated<Activity>>("/api/v1/activities", { params }).then((r) => r.data),
  timeline: (entity: EntityType, id: string, page = 1, limit = 50) =>
    apiClient.get<Paginated<Activity>>(`/api/v1/${entity}s/${id}/timeline`, { params: { page, limit } }).then((r) => r.data),
};
