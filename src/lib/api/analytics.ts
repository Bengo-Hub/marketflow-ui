import { apiClient } from "./client";

/** GET /api/v1/analytics/dashboard (marketflow-api analytics.DashboardData). */
export interface DashboardData {
  leads: {
    total: number;
    this_week: number;
    prev_week: number;
    delta_percent: number;
    converted: number;
    conversion_rate: number;
    in_window: number;
  };
  chat_sessions: { this_week: number };
  campaigns: { active: number };
  meetings: { upcoming_week: number };
  nurture: { active_enrollments: number };
  days: number;
  daily: Array<{ day: string; count: number }>;
  by_source: Array<{ source: string; count: number }>;
  generated_at: string;
}

/** GET /api/v1/analytics/profile: public page events over the last `days` days. */
export interface ProfileMetrics {
  days: number;
  counts: Partial<Record<"page_view" | "cta_click" | "whatsapp_click" | "chat_open" | "book_click" | "product_click" | "testimonial_view", number>>;
  unique_visitors: number;
  total_events: number;
}

export type DashboardDays = 7 | 30 | 90;

export const analyticsApi = {
  dashboard: (days: DashboardDays) =>
    apiClient.get<DashboardData>("/api/v1/analytics/dashboard", { params: { days } }).then((r) => r.data),
  profile: (days: DashboardDays) =>
    apiClient.get<ProfileMetrics>("/api/v1/analytics/profile", { params: { days } }).then((r) => r.data),
};
