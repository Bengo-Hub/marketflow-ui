"use client";

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { inboxApi, type InboxFilter } from "@/lib/api/inbox";

/** The inbox for a filter, page by page (keyset cursor); new comments show within a minute. */
export function useInbox(f: InboxFilter) {
  return useInfiniteQuery({
    queryKey: ["inbox", f.kind ?? "all", f.intent ?? "all", f.open ? "open" : "all"],
    queryFn: ({ pageParam }) => inboxApi.list(f, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => (last.has_more ? last.next_cursor : undefined),
    refetchInterval: 60_000,
  });
}

function useInboxAction<A>(fn: (a: A) => Promise<unknown>, ok: string, fail: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: () => {
      toast.success(ok);
      void qc.invalidateQueries({ queryKey: ["inbox"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, fail)),
  });
}

export const useInboxReply = () =>
  useInboxAction(({ id, text }: { id: string; text: string }) => inboxApi.reply(id, text), "Reply sent", "Could not send the reply");
export const useInboxHandled = () => useInboxAction(inboxApi.handled, "Marked as handled", "Could not mark it handled");
export const useInboxPromote = () => useInboxAction(inboxApi.promote, "Added to your leads", "Could not add the lead");
export const useInboxHide = () =>
  useInboxAction(({ id, hidden }: { id: string; hidden: boolean }) => inboxApi.hide(id, hidden), "Comment updated", "Could not change the comment");
export const useInboxDelete = () => useInboxAction(inboxApi.remove, "Comment deleted", "Could not delete the comment");
