"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { leadsApi, type LeadFilters, type LeadUpdate } from "@/lib/api/leads";

export function useLeads(filters: LeadFilters, page: number) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["leads", orgSlug, filters, page],
    queryFn: () => leadsApi.list(filters, page),
    staleTime: 30_000,
    placeholderData: keepPreviousData,
  });
}

export function useLead(id: string) {
  return useQuery({ queryKey: ["lead", id], queryFn: () => leadsApi.get(id), enabled: !!id });
}

export function useUpdateLead(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: LeadUpdate) => leadsApi.update(id, body),
    onSuccess: () => {
      toast.success("Lead updated");
      void qc.invalidateQueries({ queryKey: ["lead", id] });
      void qc.invalidateQueries({ queryKey: ["leads"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update the lead")),
  });
}
