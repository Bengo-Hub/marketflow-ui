"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import {
  creativeApi,
  IN_PROGRESS,
  type BriefInput,
  type CreativeBrief,
  type MotionInput,
  type ReviseInput,
  type Tier,
  type VersionInput,
} from "@/lib/api/creative";
import { useAuthStore } from "@/store/auth-store";
import { useTeam } from "./use-team";

export function useBriefs(status: "active" | "archived", page: number, limit: number) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["creative-briefs", orgSlug, status, page],
    queryFn: () => creativeApi.briefs({ status, page, limit }),
    placeholderData: keepPreviousData,
  });
}

/** The brief with its versions. While a poster is being made it checks again every 4 seconds. */
export function useBrief(id: string) {
  return useQuery({
    queryKey: ["creative-brief", id],
    queryFn: () => creativeApi.brief(id),
    refetchInterval: (q) => {
      const versions = (q.state.data as CreativeBrief | undefined)?.edges?.versions ?? [];
      return versions.some((v) => IN_PROGRESS.includes(v.status)) ? 4000 : false;
    },
  });
}

export function useOfferingSearch(q: string) {
  return useQuery({
    queryKey: ["creative-offerings", q],
    queryFn: () => creativeApi.offerings(q),
    staleTime: 60_000,
    retry: false,
  });
}

export function useCreativeQuote(tenantId: string | undefined, tier: Tier) {
  return useQuery({
    queryKey: ["creative-quote", tenantId, tier],
    queryFn: () => creativeApi.quote(tenantId!, tier),
    enabled: !!tenantId,
    staleTime: 30_000,
    retry: false,
  });
}

/**
 * Whether the signed-in person may approve an ad: a platform owner, or a member of this
 * business with the admin or owner role (marketflow-api creative.ApprovalRoles). The API
 * checks again; this only hides a button that would answer 403.
 */
export function useCanApprove(): boolean {
  const platformOwner = useAuthStore((s) => s.user?.isPlatformOwner ?? false);
  const team = useTeam();
  if (platformOwner) return true;
  const me = team.data?.members.find((m) => m.you);
  if (!me) return !team.isSuccess; // unknown yet: show it and let the API decide
  return me.roles.some((r) => r === "marketflow_admin" || r === "fbo_owner");
}

export function useCreateBrief() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BriefInput) => creativeApi.createBrief(data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["creative-briefs"] }),
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create the ad")),
  });
}

export function useUpdateBrief(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BriefInput) => creativeApi.updateBrief(id, data),
    onSuccess: (_, data) => {
      toast.success(data.status === "archived" ? "Ad archived" : data.status === "active" ? "Ad restored" : "Ad saved");
      void qc.invalidateQueries({ queryKey: ["creative-brief", id] });
      void qc.invalidateQueries({ queryKey: ["creative-briefs"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the ad")),
  });
}

/** Every version action refreshes the brief, so its list shows the new state. */
function useVersionAction<A>(briefId: string, fn: (a: A) => Promise<unknown>, ok: string, fail: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(ok);
      void qc.invalidateQueries({ queryKey: ["creative-brief", briefId] });
      void qc.invalidateQueries({ queryKey: ["creative-quote"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, fail)),
  });
}

export const useMakePoster = (briefId: string) =>
  useVersionAction(briefId, (d: VersionInput) => creativeApi.makePoster(briefId, d), "Poster started. It takes about a minute.", "Could not start the poster");
export const useApprove = (briefId: string) => useVersionAction(briefId, creativeApi.approve, "Approved. The files are kept.", "Could not approve");
export const useDiscard = (briefId: string) => useVersionAction(briefId, creativeApi.discard, "Discarded", "Could not discard");
export const useExtend = (briefId: string) => useVersionAction(briefId, creativeApi.extend, "Kept for 7 days", "Could not keep it longer");
export const useRevise = (briefId: string) =>
  useVersionAction(briefId, ({ id, data }: { id: string; data: ReviseInput }) => creativeApi.revise(id, data), "New words on the same picture, ready in a few seconds", "Could not change the words");
export const useMotion = (briefId: string) =>
  useVersionAction(briefId, ({ id, data }: { id: string; data: MotionInput }) => creativeApi.motion(id, data), "Motion poster started. It takes a few minutes.", "Could not start the motion poster");
