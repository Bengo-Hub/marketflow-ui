import { apiClient } from "./client";

/**
 * Organic publishing (Sprint 16): an approved video posted to the business's own Facebook Page,
 * Instagram, YouTube channel and TikTok, now or on a schedule. Contract:
 * marketflow/docs/sprint-plans/sprint-16-organic-publishing.md.
 */

const base = "/api/v1/publishing";

export type Platform = "facebook" | "instagram" | "youtube" | "tiktok";
export type JobStatus = "pending" | "uploading" | "processing" | "published" | "failed" | "cancelled";

export interface PublishAccount {
  id: string;
  platform: Platform;
  display_name: string;
  /** The platform's switch is on (its app review has passed). */
  enabled: boolean;
  /** A permission is missing; the account has to be connected again. */
  needs_reconnect: boolean;
}

export interface PublishJob {
  id: string;
  asset_id: string;
  connected_account_id: string;
  platform: Platform;
  caption: string;
  planned_at: string;
  status: JobStatus;
  permalink?: string;
  error?: string;
  attempts: number;
  published_at?: string;
}

export interface ScheduleInput {
  asset_id: string;
  connected_account_ids: string[];
  caption: string;
  /** Omit to post now. */
  scheduled_at?: string;
  made_for_kids: boolean;
}

export interface JobPage {
  data: PublishJob[];
  next_cursor?: string;
  has_more: boolean;
}

export const publishingApi = {
  accounts: () => apiClient.get<{ data: PublishAccount[] }>(`${base}/accounts`).then((r) => r.data.data),
  schedule: (data: ScheduleInput) => apiClient.post<{ data: PublishJob[] }>(`${base}/jobs`, data).then((r) => r.data.data),
  list: (params: { from: string; to: string; status?: JobStatus; cursor?: string }) =>
    apiClient.get<JobPage>(`${base}/jobs`, { params: { ...params, limit: 50 } }).then((r) => r.data),
  cancel: (id: string) => apiClient.post<PublishJob>(`${base}/jobs/${id}/cancel`).then((r) => r.data),
  retry: (id: string) => apiClient.post<PublishJob>(`${base}/jobs/${id}/retry`).then((r) => r.data),
};

export const PLATFORM_LABEL: Record<Platform, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  tiktok: "TikTok",
};

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  pending: "Scheduled",
  uploading: "Uploading",
  processing: "Processing",
  published: "Posted",
  failed: "Failed",
  cancelled: "Cancelled",
};

/** Caption limits the platforms document; the server checks them again before posting. */
export const CAPTION_LIMIT = 2200;
