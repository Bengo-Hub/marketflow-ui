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

/** The send becomes a broadcast in notifications-api that waits for approval in Broadcasts. */
export type SendSMSResult = {
  campaign_id: string;
  broadcast_id: string;
  status: string;
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
   * Send a campaign SMS to a segment. The backend hands it to notifications-api's broadcast
   * engine (consent, opt-outs and the STOP line, paced sends); it goes out once approved in
   * notifications Broadcasts.
   * Backend: POST /api/v1/{tenantID}/campaigns/{campaignID}/send-sms
   */
  sendSMS: (campaignId: string, payload: SendSMSPayload) =>
    apiClient.post<SendSMSResult>(
      `/api/v1/campaigns/${campaignId}/send-sms`,
      payload,
    ),
};
