import { apiClient } from "./client";

/**
 * Social inbox (Sprint 22): Facebook and Instagram comments and DMs, tagged by intent. Contract:
 * marketflow/docs/sprint-plans/sprint-22-social-inbox.md and docs/integrations/social-inbox-apis.md.
 */

const base = "/api/v1/inbox";

export type InboxKind = "comment" | "dm";
export type IntentStatus = "pending" | "tagged" | "untagged" | "flagged";

export interface InboxItem {
  id: string;
  kind: InboxKind;
  platform: "facebook" | "instagram";
  contact_id: string;
  sender_name?: string;
  text: string;
  at: string;
  intent?: string;
  intent_status: IntentStatus;
  post_id?: string;
  ad_id?: string;
  handled_at?: string;
  replied_at?: string;
  lead_id?: string;
  can_reply: boolean;
  reply_window?: string;
}

export interface InboxPage {
  data: InboxItem[];
  next_cursor?: string;
  has_more: boolean;
}

export interface InboxFilter {
  kind?: InboxKind;
  intent?: string;
  open?: boolean;
}

export const inboxApi = {
  list: (f: InboxFilter, cursor?: string) =>
    apiClient
      .get<InboxPage>(base, { params: { kind: f.kind, intent: f.intent, open: f.open ? "true" : undefined, cursor, limit: 30 } })
      .then((r) => r.data),
  reply: (id: string, text: string) => apiClient.post<InboxItem>(`${base}/${id}/reply`, { text }).then((r) => r.data),
  handled: (id: string) => apiClient.post<InboxItem>(`${base}/${id}/handled`).then((r) => r.data),
  promote: (id: string) => apiClient.post<{ lead_id: string }>(`${base}/${id}/promote`).then((r) => r.data),
};

export const INTENT_LABEL: Record<string, string> = {
  buyer_price: "Asks the price",
  buyer_shipping: "Asks about delivery",
  buyer_availability: "Asks if available",
  buyer_other: "Wants to buy",
  support: "Needs help",
  complaint: "Complaint",
  praise: "Praise",
  spam: "Spam",
  other: "Other",
  injection: "Suspicious",
};

export const MAX_REPLY = 1000;
export const MAX_AUTO_REPLY = 500;
