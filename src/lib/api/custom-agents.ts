import { apiClient } from "./client";

export const customAgentsApi = {
  list: () => apiClient.get("/api/v1/agents/custom"),
  get: (id: string) => apiClient.get(`/api/v1/agents/custom/${id}`),
  create: (data: Record<string,unknown>) => apiClient.post("/api/v1/agents/custom", data),
  update: (id: string, data: Record<string,unknown>) => apiClient.put(`/api/v1/agents/custom/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/agents/custom/${id}`),
  listRuns: (id: string) => apiClient.get(`/api/v1/agents/custom/${id}/runs`),
  triggerRun: (id: string) => apiClient.post(`/api/v1/agents/custom/${id}/run`),
};
