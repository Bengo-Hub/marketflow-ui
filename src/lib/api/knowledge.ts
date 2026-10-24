import { apiClient } from "./client";
import type { Paginated } from "./types";

export const KB_CATEGORIES = ["product", "faq", "business_opportunity", "compliance", "custom"] as const;

/** A knowledge base entry: what the chat assistant answers from. */
export interface KbEntry {
  id: string;
  tenant_id: string;
  /** "platform" rows are shared with every tenant and can only be read. */
  scope?: string;
  category: string;
  title: string;
  content: string;
  product_code?: string | null;
  product_price?: number | null;
  product_cc?: number | null;
  product_image_url?: string | null;
  /** True once the assistant has indexed the latest content. */
  embedded: boolean;
  tags?: string[];
  updated_at?: string;
  created_at: string;
}

export interface KbInput {
  category: string;
  title: string;
  content: string;
  product_code?: string;
  product_price?: number;
  product_cc?: number;
  product_image_url?: string;
  tags?: string[];
}

export interface KbImportResult {
  imported: number;
  skipped: number;
  errors?: string[];
}

export const knowledgeApi = {
  list: (params: { q?: string; category?: string }, page: number, limit = 20) =>
    apiClient
      .get<Paginated<KbEntry>>("/api/v1/knowledge/entries", {
        params: { ...Object.fromEntries(Object.entries(params).filter(([, v]) => v && v !== "all")), page, limit },
      })
      .then((r) => r.data),
  create: (data: KbInput) => apiClient.post<KbEntry>("/api/v1/knowledge/entries", data).then((r) => r.data),
  update: (id: string, data: Partial<KbInput>) => apiClient.put<KbEntry>(`/api/v1/knowledge/entries/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/api/v1/knowledge/entries/${id}`).then(() => undefined),
  /** CSV with a header row: title and content required; category, product_*, tags optional. */
  importCsv: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    // Axios sets multipart/form-data with the boundary itself for FormData bodies.
    return apiClient.post<KbImportResult>("/api/v1/knowledge/entries/import", form).then((r) => r.data);
  },
};
