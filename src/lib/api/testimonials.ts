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
};
