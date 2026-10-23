"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { suggestionsApi } from "@/lib/api/suggestions";
import { tasksApi } from "@/lib/api/tasks";
import { rows } from "@/lib/api/types";

export interface Suggestion {
  id: string;
  subject?: string;
  body?: string;
  entity_type?: string;
  entity_id?: string;
  created_at: string;
}

export interface AttentionTask {
  id: string;
  title: string;
  due_at?: string | null;
  priority?: string;
  entity_type?: string;
  entity_id?: string;
}

export interface AttentionMeeting {
  id: string;
  meeting_type: string;
  scheduled_at: string;
  attendee_name?: string | null;
  meeting_url?: string | null;
  google_event_link?: string | null;
}

/**
 * What needs the user today, for the header bell: overdue tasks, meetings in the next 24 hours and
 * the agents' open suggestions. Polls every two minutes while the app is open.
 */
export function useAttention(enabled: boolean) {
  return useQuery({
    queryKey: ["attention"],
    enabled,
    staleTime: 60_000,
    refetchInterval: 120_000,
    queryFn: async () => {
      const now = new Date();
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      const [overdue, meetings, suggestions] = await Promise.allSettled([
        tasksApi.list({ overdue: "true", limit: "10" }),
        apiClient.get("/api/v1/meetings", {
          params: { status: "scheduled", date_from: now.toISOString(), date_to: tomorrow.toISOString(), limit: 10 },
        }),
        suggestionsApi.list(),
      ]);
      return {
        tasks: overdue.status === "fulfilled" ? rows<AttentionTask>(overdue.value.data) : [],
        meetings: meetings.status === "fulfilled" ? rows<AttentionMeeting>(meetings.value.data) : [],
        suggestions: suggestions.status === "fulfilled" ? rows<Suggestion>(suggestions.value.data) : [],
        failed: [overdue, meetings, suggestions].every((r) => r.status === "rejected"),
      };
    },
  });
}

export function useDismissSuggestion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => suggestionsApi.dismiss(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["attention"] }),
  });
}
