"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { testimonialsApi, type Testimonial, type TestimonialInput } from "@/lib/api/testimonials";

export function useTestimonials() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({ queryKey: ["testimonials", orgSlug], queryFn: testimonialsApi.list });
}

export function useSaveTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: TestimonialInput }) => (id ? testimonialsApi.update(id, data) : testimonialsApi.create(data)),
    onSuccess: (_t, v) => {
      if (v.data.is_published !== undefined && Object.keys(v.data).length === 1) toast.success(v.data.is_published ? "Shown on your page" : "Hidden from your page");
      else toast.success(v.id ? "Testimonial saved" : "Testimonial added");
      void qc.invalidateQueries({ queryKey: ["testimonials"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the testimonial")),
  });
}

export function useRemoveTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => testimonialsApi.remove(id),
    onSuccess: () => {
      toast.success("Testimonial deleted");
      void qc.invalidateQueries({ queryKey: ["testimonials"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete the testimonial")),
  });
}

/** Moves one testimonial up or down by renumbering the list in steps of 10 and saving only the rows that changed. */
export function useMoveTestimonial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ list, index, dir }: { list: Testimonial[]; index: number; dir: -1 | 1 }) => {
      const to = index + dir;
      if (to < 0 || to >= list.length) return;
      const next = [...list];
      [next[index], next[to]] = [next[to], next[index]];
      const changed = next.map((t, i) => ({ t, order: (i + 1) * 10 })).filter(({ t, order }) => t.display_order !== order);
      await Promise.all(changed.map(({ t, order }) => testimonialsApi.update(t.id, { display_order: order })));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: ["testimonials"] }),
    onError: (e) => toast.error(apiErrorMessage(e, "Could not reorder")),
  });
}
