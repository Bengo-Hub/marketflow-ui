import { apiClient } from "./client";

export const dealsApi = {
  list: (params?: Record<string,string>) => apiClient.get("/api/v1/deals", { params }),
  get: (id: string) => apiClient.get(`/api/v1/deals/${id}`),
  create: (data: Record<string,unknown>) => apiClient.post("/api/v1/deals", data),
  update: (id: string, data: Record<string,unknown>) => apiClient.put(`/api/v1/deals/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/deals/${id}`),
  move: (id: string, stageId: string) => apiClient.post(`/api/v1/deals/${id}/move`, { stage_id: stageId }),
  markWon: (id: string) => apiClient.post(`/api/v1/deals/${id}/won`),
  markLost: (id: string, reason?: string) => apiClient.post(`/api/v1/deals/${id}/lost`, { lost_reason: reason }),
};
