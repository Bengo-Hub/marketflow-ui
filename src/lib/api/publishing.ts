import { apiClient } from "./client";

/**
 * Organic publishing (Sprint 16): an approved video posted to the business's own Facebook Page,
 * Instagram, YouTube channel and TikTok, now or on a schedule. Contract:
 * marketflow/docs/sprint-plans/sprint-16-organic-publishing.md.
 */

const base = "/api/v1/publishing";

export type Platform = "facebook" | "instagram" | "youtube" | "tiktok";
export type JobStatus = "pending" | "uploading" | "processing" | "published" | "failed" | "cancelled" | "deleted_on_platform";

export interface PublishAccount {
  id: string;
  platform: Platform;
  display_name: string;
  /** The platform's switch is on (its app review has passed). */
  enabled: boolean;
  /** A permission is missing; the account has to be connected again. */
  needs_reconnect: boolean;
  /**
   * The account can post but was connected before MarketFlow asked to delete posts; reconnecting
   * grants it (owner 2026-11-14).
   */
  needs_reconnect_to_delete?: boolean;
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
  /**
   * A published post the platform's API lets MarketFlow delete, with the account's current
   * permissions (owner 2026-11-14). When false on a published post, the reason and the
   * platform's own steps say how to delete it there.
   */
  can_delete_on_platform?: boolean;
  delete_unavailable_reason?: string;
  delete_steps?: string[];
  delete_help_url?: string;
  deleted_at?: string;
  deleted_by?: string;
}

export interface ScheduleInput {
  asset_id: string;
  connected_account_ids: string[];
  caption: string;
  /** Omit to post now. */
  scheduled_at?: string;
  /** Moves each platform's post to its next best-time window at or after scheduled_at (or now). */
  best_time?: boolean;
  made_for_kids: boolean;
  /** Each platform's own AI label on this post; omitted follows the business's setting. */
  ai_generated?: boolean;
  /** Required when a TikTok account is picked. */
  tiktok?: TikTokOptions;
  /** The person agreed to TikTok's Music Usage Confirmation (and Branded Content Policy). */
  tiktok_consent?: boolean;
}

export type TikTokPrivacy = "PUBLIC_TO_EVERYONE" | "MUTUAL_FOLLOW_FRIENDS" | "FOLLOWER_OF_CREATOR" | "SELF_ONLY";

export interface TikTokOptions {
  privacy_level: TikTokPrivacy;
  allow_comment: boolean;
  allow_duet: boolean;
  allow_stitch: boolean;
  /** Promotes the business's own brand ("Your brand"). */
  brand_organic: boolean;
  /** A paid partnership for a third party ("Branded content"); never private. */
  brand_content: boolean;
}

/** TikTok creator_info for the publish dialog, read each time a TikTok account is picked. */
export interface TikTokCreatorInfo {
  nickname: string;
  username: string;
  avatar_url: string;
  privacy_level_options: TikTokPrivacy[];
  comment_disabled: boolean;
  duet_disabled: boolean;
  stitch_disabled: boolean;
  max_video_post_duration_sec: number;
}

export const TIKTOK_PRIVACY_LABEL: Record<TikTokPrivacy, string> = {
  PUBLIC_TO_EVERYONE: "Everyone",
  MUTUAL_FOLLOW_FRIENDS: "Friends",
  FOLLOWER_OF_CREATOR: "Followers",
  SELF_ONLY: "Only me",
};

export interface JobPage {
  data: PublishJob[];
  next_cursor?: string;
  has_more: boolean;
}

export const publishingApi = {
  accounts: () => apiClient.get<{ data: PublishAccount[] }>(`${base}/accounts`).then((r) => r.data.data),
  tiktokCreatorInfo: (accountId: string) =>
    apiClient.get<TikTokCreatorInfo>(`${base}/accounts/${accountId}/tiktok-creator-info`).then((r) => r.data),
  schedule: (data: ScheduleInput) => apiClient.post<{ data: PublishJob[] }>(`${base}/jobs`, data).then((r) => r.data.data),
  list: (params: { from: string; to: string; status?: JobStatus; cursor?: string }) =>
    apiClient.get<JobPage>(`${base}/jobs`, { params: { ...params, limit: 50 } }).then((r) => r.data),
  cancel: (id: string) => apiClient.post<PublishJob>(`${base}/jobs/${id}/cancel`).then((r) => r.data),
  retry: (id: string) => apiClient.post<PublishJob>(`${base}/jobs/${id}/retry`).then((r) => r.data),
  /** bestTime moves it to its platform's next best-time window at or after scheduledAt (server-side, the posting plan). */
  move: (id: string, scheduledAt: string, bestTime = false) =>
    apiClient.post<PublishJob>(`${base}/jobs/${id}/move`, { scheduled_at: scheduledAt, best_time: bestTime || undefined }).then((r) => r.data),
  /** Deletes a published post from its platform; repeating it answers the same job. */
  deleteFromPlatform: (id: string) => apiClient.post<PublishJob>(`${base}/jobs/${id}/delete-from-platform`).then((r) => r.data),
  /** The posting plan: best-time windows and cadence per platform (marketflow-api postingplan). */
  bestTimes: () => apiClient.get<BestTimes>(`${base}/best-times`).then((r) => r.data),
  /** Saves the business's own windows or cadence; a platform set to null goes back to the default. */
  saveBestTimes: (data: BestTimesUpdate) => apiClient.put<BestTimes>(`${base}/best-times`, data).then((r) => r.data),
};

/** A span of local time: days are "weekdays", "weekend", "daily" or a list like "mon,wed,fri". */
export interface PostingWindow {
  days: string;
  start: string;
  end: string;
}

export interface PostingCadence {
  count: number;
  per: "week" | "month";
}

export type PlanSource = "default" | "platform" | "tenant";

export interface BestTimesPlatform {
  windows: PostingWindow[];
  windows_source: PlanSource;
  cadence: PostingCadence;
  cadence_source: PlanSource;
  next_best_time: string;
  booked: { week: number; month: number };
  due: boolean;
}

export interface BestTimes {
  timezone: string;
  platforms: Record<Platform, BestTimesPlatform>;
  defaults: { windows: Record<Platform, PostingWindow[]>; cadence: Record<Platform, PostingCadence> };
}

export interface BestTimesUpdate {
  windows?: Partial<Record<Platform, PostingWindow[] | null>>;
  cadence?: Partial<Record<Platform, PostingCadence | null>>;
}

const DAYS_LABEL: Record<string, string> = { weekdays: "Weekdays", weekend: "Weekends", daily: "Every day" };

/** "Weekdays 12:00 to 14:00". */
export function windowLabel(w: PostingWindow): string {
  const days = DAYS_LABEL[w.days] ?? w.days.split(",").map((d) => d.trim().slice(0, 1).toUpperCase() + d.trim().slice(1, 3)).join(", ");
  return `${days} ${w.start} to ${w.end}`;
}

/** "3 a week". */
export function cadenceLabel(c: PostingCadence): string {
  return c.count === 0 ? "No posts" : `${c.count} a ${c.per}`;
}

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
  deleted_on_platform: "Deleted from platform",
};

/** Caption limits the platforms document; the server checks them again before posting. */
export const CAPTION_LIMIT = 2200;
