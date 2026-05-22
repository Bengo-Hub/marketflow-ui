import { apiClient } from "./client";

export const accountsApi = {
  list: (params?: Record<string,string>) => apiClient.get("/api/v1/accounts", { params }),
  get: (id: string) => apiClient.get(`/api/v1/accounts/${id}`),
  create: (data: Record<string,unknown>) => apiClient.post("/api/v1/accounts", data),
  update: (id: string, data: Record<string,unknown>) => apiClient.put(`/api/v1/accounts/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/accounts/${id}`),
  listContacts: (id: string) => apiClient.get(`/api/v1/accounts/${id}/contacts`),
};
