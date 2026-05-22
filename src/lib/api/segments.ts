import { apiClient } from "./client";

export const segmentsApi = {
  list: () => apiClient.get("/api/v1/segments"),
  get: (id: string) => apiClient.get(`/api/v1/segments/${id}`),
  create: (data: Record<string,unknown>) => apiClient.post("/api/v1/segments", data),
  update: (id: string, data: Record<string,unknown>) => apiClient.put(`/api/v1/segments/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/segments/${id}`),
  evaluate: (id: string) => apiClient.post(`/api/v1/segments/${id}/evaluate`),
};
