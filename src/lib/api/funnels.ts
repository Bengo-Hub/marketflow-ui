import { apiClient } from "./client";
import type { Paginated } from "./types";

export const FUNNEL_TYPES = ["product_inquiry", "recruitment", "c9_challenge", "generic"] as const;
export const FUNNEL_STATUSES = ["draft", "published", "archived"] as const;
export const BLOCK_TYPES = ["form", "content", "whatsapp", "google_calendar", "product", "recruit"] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export interface FunnelField {
  key: string;
  label: string;
  type?: "text" | "email" | "tel" | "number" | "date" | "textarea";
  required?: boolean;
  placeholder?: string;
}

/** One block of the public page (rendered by /f/{slug}). */
export interface FunnelStep {
  id?: string;
  block_type: BlockType;
  title?: string;
  description?: string;
  cta_text?: string;
  cta_url?: string;
  fields?: FunnelField[];
  product_code?: string;
  product_name?: string;
  product_image?: string;
  product_price?: string;
  product_cc?: string;
  whatsapp_message?: string;
}

/** Page copy and theme live in metadata (marketflow-api funnels.Meta* keys). */
export interface FunnelMeta {
  headline?: string;
  subheadline?: string;
  description?: string;
  brand_color?: string;
  hero_image_url?: string;
  [k: string]: unknown;
}

export interface Funnel {
  id: string;
  name: string;
  slug: string;
  funnel_type: string;
  status: string;
  steps?: FunnelStep[] | null;
  landing_page_html?: string | null;
  total_views?: number;
  total_submissions?: number;
  conversion_rate?: number;
  metadata?: FunnelMeta | null;
  published_at?: string | null;
  created_at: string;
}

export interface FunnelInput {
  name: string;
  slug: string;
  funnel_type?: string;
  steps?: FunnelStep[];
  landing_page_html?: string;
  metadata?: FunnelMeta;
}

export interface FunnelAnalytics {
  funnel_id: string;
  slug: string;
  total_steps: number;
  steps: Array<{ step_index: number; views: number; dropoff?: number; dropoff_rate?: number }>;
  lead_submissions: number;
}

export const funnelsApi = {
  list: (status: string, page: number, limit = 20) =>
    apiClient
      .get<Paginated<Funnel>>("/api/v1/funnels", { params: { ...(status !== "all" ? { status } : {}), page, limit } })
      .then((r) => r.data),
  create: (data: FunnelInput) => apiClient.post<Funnel>("/api/v1/funnels", data).then((r) => r.data),
  update: (id: string, data: Partial<FunnelInput> & { status?: string }) => apiClient.put<Funnel>(`/api/v1/funnels/${id}`, data).then((r) => r.data),
  publish: (id: string) => apiClient.post<Funnel>(`/api/v1/funnels/${id}/publish`).then((r) => r.data),
  /** Archives the funnel (the API keeps the row). */
  archive: (id: string) => apiClient.delete(`/api/v1/funnels/${id}`).then(() => undefined),
  analytics: (id: string) => apiClient.get<FunnelAnalytics>(`/api/v1/funnels/${id}/analytics`).then((r) => r.data),
};

/** "Bridal Package 2026" -> "bridal-package-2026" */
export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}
