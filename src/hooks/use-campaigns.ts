"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { campaignsApi, type CampaignInput } from "@/lib/api/campaigns";
import { apiErrorMessage } from "@/lib/api/errors";

export function useCampaigns(status: string, page: number) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["campaigns", orgSlug, status, page],
    queryFn: () => campaignsApi.list({ status }, page),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCampaign(id: string) {
  return useQuery({ queryKey: ["campaign", id], queryFn: () => campaignsApi.get(id), enabled: !!id });
}

export function useCampaignMetrics(id: string, days: number) {
  return useQuery({
    queryKey: ["campaign-metrics", id, days],
    queryFn: () => campaignsApi.metrics(id, days),
    enabled: !!id,
    refetchInterval: 5 * 60_000,
    placeholderData: keepPreviousData,
  });
}

function useInvalidate() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: ["campaigns"] });
    if (id) void qc.invalidateQueries({ queryKey: ["campaign", id] });
  };
}

export function useSaveCampaign() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: CampaignInput }) => (id ? campaignsApi.update(id, data) : campaignsApi.create(data)),
    onSuccess: (_c, v) => {
      toast.success(v.id ? "Campaign saved" : "Campaign created");
      invalidate(v.id);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the campaign")),
  });
}

/**
 * Pause or resume (the /pause and /resume endpoints had no UI), or end. DELETE /campaigns/{id}
 * does not delete: it marks the campaign completed, so the UI calls it "End".
 */
export function useCampaignAction() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "pause" | "resume" | "end" }): Promise<void> => {
      if (action === "pause") await campaignsApi.pause(id);
      else if (action === "resume") await campaignsApi.resume(id);
      else await campaignsApi.remove(id);
    },
    onSuccess: (_r, v) => {
      toast.success(v.action === "pause" ? "Campaign paused" : v.action === "resume" ? "Campaign resumed" : "Campaign ended");
      invalidate(v.id);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update the campaign")),
  });
}
