"use client";

import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { dealsApi, type DealInput, type DealUpdate } from "@/lib/api/deals";
import { apiErrorMessage } from "@/lib/api/errors";
import { DEFAULT_STAGES, pipelinesApi, type PipelineStage } from "@/lib/api/pipelines";

export function usePipelines() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({ queryKey: ["pipelines", orgSlug], queryFn: pipelinesApi.list, staleTime: 5 * 60_000 });
}

/**
 * Open deals per stage, one query per column (50 each), so a board stays fast however many deals
 * the tenant has. Won and lost stages are shown from the deal status instead.
 */
export function useBoard(pipelineId: string | null, stages: PipelineStage[]) {
  return useQueries({
    queries: stages.map((s) => ({
      queryKey: ["deals", "stage", s.id],
      queryFn: () => dealsApi.list({ pipeline_id: pipelineId!, stage_id: s.id, status: "open", limit: 50 }),
      enabled: !!pipelineId,
      staleTime: 30_000,
    })),
  });
}

export function useDeal(id: string | null) {
  return useQuery({ queryKey: ["deal", id], queryFn: () => dealsApi.get(id!), enabled: !!id });
}

function useRefresh() {
  const qc = useQueryClient();
  return (id?: string) => {
    void qc.invalidateQueries({ queryKey: ["deals"] });
    if (id) void qc.invalidateQueries({ queryKey: ["deal", id] });
  };
}

export function useCreateDeal() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: (data: DealInput) => dealsApi.create(data),
    onSuccess: () => {
      toast.success("Deal added");
      refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not add the deal")),
  });
}

export function useDealAction() {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: async (a: { id: string; kind: "move"; stageId: string } | { id: string; kind: "won" } | { id: string; kind: "lost"; reason?: string } | { id: string; kind: "update"; data: DealUpdate }) => {
      if (a.kind === "move") await dealsApi.move(a.id, a.stageId);
      else if (a.kind === "won") await dealsApi.markWon(a.id);
      else if (a.kind === "lost") await dealsApi.markLost(a.id, a.reason);
      else await dealsApi.update(a.id, a.data);
    },
    onSuccess: (_r, a) => {
      toast.success(a.kind === "won" ? "Deal won" : a.kind === "lost" ? "Deal marked lost" : a.kind === "move" ? "Deal moved" : "Deal saved");
      refresh(a.id);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not update the deal")),
  });
}

/** Creates the first pipeline with the default stages (pipelines had no UI, so none existed). */
export function useSetupPipeline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const p = await pipelinesApi.create({ name: "Sales", is_default: true });
      for (const s of DEFAULT_STAGES) await pipelinesApi.createStage(p.id, s);
      return p;
    },
    onSuccess: () => {
      toast.success("Pipeline ready");
      void qc.invalidateQueries({ queryKey: ["pipelines"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not set up the pipeline")),
  });
}
