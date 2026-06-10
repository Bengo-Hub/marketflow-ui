import { apiClient } from "./client";

/**
 * Campaigns API client.
 *
 * Tenant scoping is handled centrally by the axios request interceptor in
 * client.ts (X-Tenant-Slug / X-Tenant-ID headers), so the {tenantID} path
 * segment from the backend route is NOT included here — every other UI call
 * (e.g. `/api/v1/campaigns/${id}`) follows the same convention.
 */

export type SendSMSPayload = {
  segment_id: string;
  message: string;
};

export type SendSMSResult = {
  queued: number;
  campaign_id: string;
};

export const campaignsApi = {
  list: (params?: Record<string, string>) =>
    apiClient.get("/api/v1/campaigns", { params }),
  get: (id: string) => apiClient.get(`/api/v1/campaigns/${id}`),
  create: (data: Record<string, unknown>) =>
    apiClient.post("/api/v1/campaigns", data),
  update: (id: string, data: Record<string, unknown>) =>
    apiClient.put(`/api/v1/campaigns/${id}`, data),
  delete: (id: string) => apiClient.delete(`/api/v1/campaigns/${id}`),

  /**
   * Queue a bulk SMS blast for a campaign against a segment.
   * Backend: POST /api/v1/{tenantID}/campaigns/{campaignID}/send-sms
   * (tenantID injected via headers — see note above).
   * Emits `marketflow.campaign.sms_queued`.
   */
  sendSMS: (campaignId: string, payload: SendSMSPayload) =>
    apiClient.post<SendSMSResult>(
      `/api/v1/campaigns/${campaignId}/send-sms`,
      payload,
    ),
};
