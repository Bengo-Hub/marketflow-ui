"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { sequencesApi, type SequenceInput } from "@/lib/api/sequences";

export function useSequences() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({ queryKey: ["sequences", orgSlug], queryFn: () => sequencesApi.list(1), staleTime: 30_000 });
}

/** Enrolment outcomes and delivery events for one sequence, loaded when its panel opens. */
export function useSequenceStats(id: string | null) {
  const enrollments = useQuery({ queryKey: ["sequence-enrollments", id], queryFn: () => sequencesApi.enrollments(id!), enabled: !!id });
  const delivery = useQuery({ queryKey: ["sequence-delivery", id], queryFn: () => sequencesApi.delivery(id!), enabled: !!id });
  return { enrollments, delivery };
}

export function useSaveSequence() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<SequenceInput> }) =>
      id ? sequencesApi.update(id, data) : sequencesApi.create(data as SequenceInput),
    onSuccess: (_s, v) => {
      toast.success(v.id ? (v.data.active === undefined || Object.keys(v.data).length > 1 ? "Sequence saved" : v.data.active ? "Sequence turned on" : "Sequence turned off") : "Sequence created");
      void qc.invalidateQueries({ queryKey: ["sequences"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the sequence")),
  });
}
