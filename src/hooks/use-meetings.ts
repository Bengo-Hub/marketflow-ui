"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { meetingsApi, type MeetingInput } from "@/lib/api/meetings";

export function useMeetings(view: "upcoming" | "past", page: number) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  // The boundary is fixed per render of the view so the query key stays stable.
  const now = new Date();
  now.setSeconds(0, 0);
  const params = view === "upcoming" ? { date_from: now.toISOString() } : { date_to: now.toISOString() };
  return useQuery({
    queryKey: ["meetings", orgSlug, view, page, now.toISOString().slice(0, 16)],
    queryFn: () => meetingsApi.list(params, page),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}

export function useSaveMeeting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: Partial<MeetingInput> & { status?: string } }) =>
      id ? meetingsApi.update(id, data) : meetingsApi.create(data as MeetingInput),
    onSuccess: (_m, v) => {
      toast.success(v.id ? (v.data.status ? `Marked ${v.data.status.replace("_", " ")}` : "Meeting saved") : "Meeting booked");
      void qc.invalidateQueries({ queryKey: ["meetings"] });
      void qc.invalidateQueries({ queryKey: ["attention"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the meeting")),
  });
}
