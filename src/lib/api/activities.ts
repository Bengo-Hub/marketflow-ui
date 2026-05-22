import { apiClient } from "./client";

export const activitiesApi = {
  log: (data: Record<string,unknown>) => apiClient.post("/api/v1/activities", data),
  list: (params?: Record<string,string>) => apiClient.get("/api/v1/activities", { params }),
  leadTimeline: (leadId: string) => apiClient.get(`/api/v1/leads/${leadId}/timeline`),
  contactTimeline: (contactId: string) => apiClient.get(`/api/v1/contacts/${contactId}/timeline`),
  dealTimeline: (dealId: string) => apiClient.get(`/api/v1/deals/${dealId}/timeline`),
};
