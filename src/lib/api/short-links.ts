import { apiClient } from "./client";
import type { Paginated } from "./types";

export const LINK_TYPES = ["custom", "product", "profile", "funnel", "whatsapp", "recruit", "category"] as const;

export interface ShortLink {
  id: string;
  code: string;
  short_url: string;
  target_url: string;
  link_type: string;
  title?: string | null;
  click_count: number;
  last_clicked_at?: string | null;
  created_at: string;
}

export interface ShortLinkInput {
  target_url: string;
  title?: string;
  link_type?: string;
  campaign_id?: string;
}

export const shortLinksApi = {
  list: (page: number, linkType?: string, limit = 25) =>
    apiClient
      .get<Paginated<ShortLink>>("/api/v1/short-links", { params: { page, limit, ...(linkType && linkType !== "all" ? { link_type: linkType } : {}) } })
      .then((r) => r.data),
  create: (data: ShortLinkInput) =>
    apiClient.post<{ id: string; code: string; short_url: string }>("/api/v1/short-links", data).then((r) => r.data),
};
