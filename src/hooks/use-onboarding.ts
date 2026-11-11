"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { onboardingApi } from "@/lib/api/onboarding";
import { justCompleted, onboardingShownKey, shouldOpenOnboarding } from "@/lib/onboarding-flow";

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

/** Dashboard: a new business is sent to setup once per session until it finishes or dismisses it. */
export function useOnboardingRedirect() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const checklist = useChecklist();
  useEffect(() => {
    if (!orgSlug) return;
    let shown = false;
    try {
      shown = sessionStorage.getItem(onboardingShownKey(orgSlug)) === "1";
    } catch {
      shown = true; // storage blocked: never risk a redirect loop
    }
    if (!shouldOpenOnboarding(checklist.data, shown)) return;
    try {
      sessionStorage.setItem(onboardingShownKey(orgSlug), "1");
    } catch {
      return;
    }
    router.replace(`/${orgSlug}/onboarding`);
  }, [checklist.data, orgSlug, router]);
}

/** Onboarding page: on to the dashboard when the last step completes during this visit. */
export function useCompletionRedirect(complete: boolean | undefined) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const previous = useRef<boolean | undefined>(undefined);
  useEffect(() => {
    if (justCompleted(previous.current, complete)) {
      toast.success("Setup done. Here is your dashboard.");
      router.replace(`/${orgSlug}/dashboard`);
    }
    previous.current = complete;
  }, [complete, orgSlug, router]);
}
