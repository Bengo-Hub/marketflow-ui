import { apiClient } from "./client";
import type { Paginated } from "./types";

export const MEETING_TYPES = ["product_demo", "business_opportunity", "follow_up", "onboarding"] as const;
export const MEETING_OUTCOMES = ["completed", "no_show", "cancelled"] as const;

/** A scheduled meeting (marketflow-api ent.ScheduledMeeting). */
export interface Meeting {
  id: string;
  lead_id?: string | null;
  contact_id?: string | null;
  meeting_type: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  meeting_url?: string | null;
  google_event_link?: string | null;
  attendee_email?: string | null;
  attendee_name?: string | null;
  organizer_email?: string | null;
  notes?: string | null;
  created_at: string;
}

export interface MeetingInput {
  scheduled_at: string;
  duration_minutes?: number;
  meeting_type?: string;
  attendee_name?: string;
  attendee_email?: string;
  meeting_url?: string;
  notes?: string;
}

export const meetingsApi = {
  list: (params: { status?: string; date_from?: string; date_to?: string }, page: number, limit = 50) =>
    apiClient
      .get<Paginated<Meeting>>("/api/v1/meetings", {
        params: { ...Object.fromEntries(Object.entries(params).filter(([, v]) => v)), page, limit },
      })
      .then((r) => r.data),
  create: (data: MeetingInput) => apiClient.post<Meeting>("/api/v1/meetings", data).then((r) => r.data),
  update: (id: string, data: Partial<MeetingInput> & { status?: string }) =>
    apiClient.put<Meeting>(`/api/v1/meetings/${id}`, data).then((r) => r.data),
};
