"use client";

import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { publishingApi, type JobStatus, type ScheduleInput } from "@/lib/api/publishing";

/** The accounts a video can go to; they change only when one is connected. */
export function usePublishAccounts(enabled = true) {
  return useQuery({ queryKey: ["publish-accounts"], queryFn: publishingApi.accounts, enabled, staleTime: 5 * 60_000 });
}

/**
 * The calendar for a window, page by page (keyset cursor). It refreshes every 30 s while a post
 * is still on its way, so the status moves without a reload.
 */
export function usePublishJobs(from: string, to: string, status?: JobStatus) {
  return useInfiniteQuery({
    queryKey: ["publish-jobs", from, to, status ?? "all"],
    queryFn: ({ pageParam }) => publishingApi.list({ from, to, status, cursor: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.has_more ? last.next_cursor : undefined),
    refetchInterval: (q) =>
      q.state.data?.pages.some((p) => p.data.some((j) => j.status === "uploading" || j.status === "processing")) ? 30_000 : false,
  });
}

function useJobAction(fn: (id: string) => Promise<unknown>, ok: string, fail: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(ok);
      void qc.invalidateQueries({ queryKey: ["publish-jobs"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, fail)),
  });
}

export function useSchedulePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (d: ScheduleInput) => publishingApi.schedule(d),
    onSuccess: (jobs, d) => {
      toast.success(d.scheduled_at ? `Scheduled for ${jobs.length} account${jobs.length === 1 ? "" : "s"}` : "Posting now. It shows on the calendar.");
      void qc.invalidateQueries({ queryKey: ["publish-jobs"] });
    },
    // The dialog shows the reason inline (preflight problems are long), so no toast here.
  });
}

export const useCancelPost = () => useJobAction(publishingApi.cancel, "Post cancelled", "Could not cancel the post");
export const useRetryPost = () => useJobAction(publishingApi.retry, "Trying the post again", "Could not retry the post");

export function useMovePost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduledAt }: { id: string; scheduledAt: string }) => publishingApi.move(id, scheduledAt),
    onSuccess: () => {
      toast.success("Post moved");
      void qc.invalidateQueries({ queryKey: ["publish-jobs"] });
    },
    // The dialog shows the reason inline, because the post stays open to pick another time.
  });
}
