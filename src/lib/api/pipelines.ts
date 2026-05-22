import { apiClient } from "./client";

export const pipelinesApi = {
  list: () => apiClient.get("/api/v1/pipelines"),
  get: (id: string) => apiClient.get(`/api/v1/pipelines/${id}`),
  create: (data: Record<string,unknown>) => apiClient.post("/api/v1/pipelines", data),
  update: (id: string, data: Record<string,unknown>) => apiClient.put(`/api/v1/pipelines/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/pipelines/${id}`),
  createStage: (pipelineId: string, data: Record<string,unknown>) => apiClient.post(`/api/v1/pipelines/${pipelineId}/stages`, data),
  updateStage: (pipelineId: string, stageId: string, data: Record<string,unknown>) => apiClient.put(`/api/v1/pipelines/${pipelineId}/stages/${stageId}`, data),
  deleteStage: (pipelineId: string, stageId: string) => apiClient.delete(`/api/v1/pipelines/${pipelineId}/stages/${stageId}`),
};
