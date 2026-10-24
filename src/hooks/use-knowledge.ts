"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { knowledgeApi, type KbInput } from "@/lib/api/knowledge";

export function useKnowledge(params: { q?: string; category?: string }, page: number) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["knowledge", orgSlug, params, page],
    queryFn: () => knowledgeApi.list(params, page),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

function useRefresh() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: ["knowledge"] });
}

export function useSaveKnowledge() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: ({ id, data }: { id?: string; data: KbInput }) => (id ? knowledgeApi.update(id, data) : knowledgeApi.create(data)),
    onSuccess: (_e, v) => {
      toast.success(v.id ? "Entry saved. The assistant relearns it in a few minutes." : "Entry added. The assistant learns it in a few minutes.");
      refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the entry")),
  });
}

export function useDeleteKnowledge() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (id: string) => knowledgeApi.remove(id),
    onSuccess: () => {
      toast.success("Entry deleted");
      refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete the entry")),
  });
}

export function useImportKnowledge() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (file: File) => knowledgeApi.importCsv(file),
    onSuccess: (r) => {
      toast.success(`${r.imported} entries imported${r.skipped ? `, ${r.skipped} skipped` : ""}`);
      refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not import the file")),
  });
}
