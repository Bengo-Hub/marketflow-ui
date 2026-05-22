import { apiClient } from "./client";

export const suggestionsApi = {
  list: () => apiClient.get("/api/v1/suggestions"),
  dismiss: (id: string) => apiClient.post(`/api/v1/suggestions/${id}/dismiss`),
};
