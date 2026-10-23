"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { funnelsApi, type FunnelInput } from "@/lib/api/funnels";

export function useFunnels(status: string, page: number) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["funnels", orgSlug, status, page],
    queryFn: () => funnelsApi.list(status, page),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useFunnelAnalytics(id: string | null) {
  return useQuery({ queryKey: ["funnel-analytics", id], queryFn: () => funnelsApi.analytics(id!), enabled: !!id, staleTime: 60_000 });
}

export function useSaveFunnel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: FunnelInput }) => (id ? funnelsApi.update(id, data) : funnelsApi.create(data)),
    onSuccess: (_f, v) => {
      toast.success(v.id ? "Funnel saved" : "Funnel created as a draft");
      void qc.invalidateQueries({ queryKey: ["funnels"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the funnel")),
  });
}

/** Publish (the /publish endpoint had no UI), take back to draft, or archive. */
export function useFunnelAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "publish" | "unpublish" | "archive" }): Promise<void> => {
      if (action === "publish") await funnelsApi.publish(id);
      else if (action === "unpublish") await funnelsApi.update(id, { status: "draft" });
      else await funnelsApi.archive(id);
    },
    onSuccess: (_r, v) => {
      toast.success(v.action === "publish" ? "Funnel is live" : v.action === "unpublish" ? "Funnel taken offline" : "Funnel archived");
      void qc.invalidateQueries({ queryKey: ["funnels"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update the funnel")),
  });
}
