"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { onboardingApi } from "@/lib/api/onboarding";

export function useChecklist(enabled = true) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({ queryKey: ["onboarding", orgSlug, "checklist"], queryFn: onboardingApi.checklist, enabled, staleTime: 30_000 });
}

/** The draft reads several services; it is fetched on demand and kept for a few minutes. */
export function useBrandDraft(enabled: boolean) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({ queryKey: ["onboarding", orgSlug, "draft"], queryFn: onboardingApi.draft, enabled, staleTime: 5 * 60_000, retry: false });
}

export function useDismissChecklist() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dismissed: boolean) => onboardingApi.dismiss(dismissed),
    onSuccess: (_r, dismissed) => {
      if (dismissed) toast.success("Setup guide hidden. You can open it again from Settings.");
      void qc.invalidateQueries({ queryKey: ["onboarding"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save")),
  });
}
