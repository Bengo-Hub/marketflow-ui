import { apiClient } from "./client";
import type { Paginated } from "./types";

/** A success story shown on the public page (marketflow-api testimonials). Lower display_order shows first. */
export interface Testimonial {
  id: string;
  author_name: string;
  author_role?: string;
  body: string;
  avatar_url?: string;
  rating: number;
  display_order: number;
  is_published: boolean;
  /** Review state: a customer's or website testimonial waits (pending) until an admin approves it. */
  status?: "pending" | "approved" | "rejected";
  /** manual (added here), form (the public testimonial link) or website (found on the business's site). */
  source?: "manual" | "form" | "website";
  consent?: boolean;
  consent_at?: string;
  submitter_email?: string;
  submitter_phone?: string;
  media_url?: string;
  media_kind?: "photo" | "video";
  source_url?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  created_at: string;
  updated_at: string;
}

/** Fields left out of an update keep their values; an empty author_role or avatar_url clears it. */
export interface TestimonialInput {
  author_name?: string;
  author_role?: string;
  body?: string;
  avatar_url?: string;
  rating?: number;
  display_order?: number;
  is_published?: boolean;
}

export const testimonialsApi = {
  list: () => apiClient.get<Paginated<Testimonial>>("/api/v1/testimonials", { params: { limit: 100 } }).then((r) => ({ ...r.data, data: r.data.data ?? [] })),
  create: (data: TestimonialInput) => apiClient.post<Testimonial>("/api/v1/testimonials", data).then((r) => r.data),
  update: (id: string, data: TestimonialInput) => apiClient.patch<Testimonial>(`/api/v1/testimonials/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/api/v1/testimonials/${id}`).then(() => undefined),
  /** Approve (and by default publish) or reject a customer's or website testimonial. Admins only. */
  approve: (id: string, publish = true) => apiClient.post<Testimonial>(`/api/v1/testimonials/${id}/approve`, { publish }).then((r) => r.data),
  reject: (id: string) => apiClient.post<Testimonial>(`/api/v1/testimonials/${id}/reject`, {}).then((r) => r.data),
};
