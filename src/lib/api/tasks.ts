import { apiClient } from "./client";

export const tasksApi = {
  list: (params?: Record<string,string>) => apiClient.get("/api/v1/tasks", { params }),
  get: (id: string) => apiClient.get(`/api/v1/tasks/${id}`),
  create: (data: Record<string,unknown>) => apiClient.post("/api/v1/tasks", data),
  update: (id: string, data: Record<string,unknown>) => apiClient.put(`/api/v1/tasks/${id}`, data),
  complete: (id: string) => apiClient.post(`/api/v1/tasks/${id}/complete`),
  delete: (id: string) => apiClient.delete(`/api/v1/tasks/${id}`),
};
