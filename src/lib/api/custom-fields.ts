import { apiClient } from "./client";

export const customFieldsApi = {
  listDefs: (params?: Record<string,string>) => apiClient.get("/api/v1/custom-fields/defs", { params }),
  createDef: (data: Record<string,unknown>) => apiClient.post("/api/v1/custom-fields/defs", data),
  updateDef: (id: string, data: Record<string,unknown>) => apiClient.put(`/api/v1/custom-fields/defs/${id}`, data),
  deleteDef: (id: string) => apiClient.delete(`/api/v1/custom-fields/defs/${id}`),
  getValues: (entityType: string, entityId: string) => apiClient.get(`/api/v1/${entityType}s/${entityId}/custom-fields`),
  setValues: (entityType: string, entityId: string, values: Record<string,unknown>) => apiClient.put(`/api/v1/${entityType}s/${entityId}/custom-fields`, values),
};
