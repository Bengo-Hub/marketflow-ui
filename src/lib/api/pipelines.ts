import { apiClient } from "./client";

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  stage_order: number;
  win_probability?: number | null;
  is_won_stage: boolean;
  is_lost_stage: boolean;
  color?: string | null;
}

/** A pipeline with its stages (ent edges). */
export interface Pipeline {
  id: string;
  name: string;
  is_default: boolean;
  edges?: { stages?: PipelineStage[] };
}

export interface StageInput {
  name: string;
  stage_order: number;
  win_probability?: number;
  is_won_stage?: boolean;
  is_lost_stage?: boolean;
}

/** Stages a new tenant starts with; editable afterwards. */
export const DEFAULT_STAGES: StageInput[] = [
  { name: "New", stage_order: 1, win_probability: 10 },
  { name: "Talking", stage_order: 2, win_probability: 30 },
  { name: "Offer sent", stage_order: 3, win_probability: 60 },
  { name: "Won", stage_order: 4, win_probability: 100, is_won_stage: true },
  { name: "Lost", stage_order: 5, win_probability: 0, is_lost_stage: true },
];

export const pipelinesApi = {
  list: () => apiClient.get<{ data: Pipeline[] }>("/api/v1/pipelines").then((r) => r.data.data ?? []),
  create: (data: { name: string; is_default?: boolean }) => apiClient.post<Pipeline>("/api/v1/pipelines", data).then((r) => r.data),
  update: (id: string, data: { name?: string; is_default?: boolean }) => apiClient.put<Pipeline>(`/api/v1/pipelines/${id}`, data).then((r) => r.data),
  createStage: (pipelineId: string, data: StageInput) => apiClient.post<PipelineStage>(`/api/v1/pipelines/${pipelineId}/stages`, data).then((r) => r.data),
  updateStage: (pipelineId: string, stageId: string, data: Partial<StageInput>) =>
    apiClient.put<PipelineStage>(`/api/v1/pipelines/${pipelineId}/stages/${stageId}`, data).then((r) => r.data),
  deleteStage: (pipelineId: string, stageId: string) => apiClient.delete(`/api/v1/pipelines/${pipelineId}/stages/${stageId}`).then(() => undefined),
};

export function sortedStages(p?: Pipeline | null): PipelineStage[] {
  return [...(p?.edges?.stages ?? [])].sort((a, b) => a.stage_order - b.stage_order);
}
