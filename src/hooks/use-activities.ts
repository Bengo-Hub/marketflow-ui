"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { activitiesApi, type ActivityInput, type EntityType } from "@/lib/api/activities";
import { apiErrorMessage } from "@/lib/api/errors";

export function useTimeline(entity: EntityType, id: string) {
  return useQuery({
    queryKey: ["timeline", entity, id],
    queryFn: () => activitiesApi.timeline(entity, id),
    enabled: !!id,
    staleTime: 30_000,
  });
}

export function useActivities(params: Record<string, string | number>) {
  return useQuery({
    queryKey: ["activities", params],
    queryFn: () => activitiesApi.list(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useLogActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ActivityInput) => activitiesApi.log(input),
    onSuccess: (_d, input) => {
      toast.success("Activity logged");
      void qc.invalidateQueries({ queryKey: ["timeline", input.entity_type, input.entity_id] });
      void qc.invalidateQueries({ queryKey: ["activities"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not log the activity")),
  });
}
