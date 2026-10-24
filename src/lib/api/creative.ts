import { aiClient, apiClient } from "./client";
import type { Paginated } from "./types";

/**
 * Creative Studio (marketflow-api modules/creative). A brief is one ad idea; each poster
 * made for it is a version. Versions are drafts until approved: their files expire after
 * 72 hours (7 days once extended), and an approved version's files are kept.
 */

export type Objective = "sales" | "leads" | "awareness" | "traffic";
export type PosterFormat = "1080x1080" | "1080x1350" | "1080x1920";
export type Tier = "standard" | "premium";
export type VersionStatus = "queued" | "rendering" | "ready" | "failed" | "approved" | "rejected" | "superseded";

/** A sellable item from the business's own data (inventory, a POS promotion, or the platform's website). */
export interface Offering {
  source: string;
  source_id: string;
  /** GOODS | SERVICE | RECIPE | PROMOTION, or a website kind for the platform tenant. */
  type: string;
  name: string;
  sku?: string;
  description?: string;
  price?: number;
  photo_urls?: string[];
  promo_code?: string;
  ends_at?: string;
}

export interface CreativeAsset {
  id: string;
  /** image | video | thumbnail | scene (scene is the poster's background, not for people). */
  kind: string;
  url: string;
  bytes: number;
  width: number;
  height: number;
  duration_ms: number;
  expires_at?: string | null;
  created_at: string;
}

export interface CreativeVersion {
  id: string;
  brief_id: string;
  parent_version_id?: string | null;
  version_no: number;
  kind: "poster" | "video";
  tier: Tier;
  format: PosterFormat;
  copy?: { prompt?: string; headline?: string; subline?: string; price?: string; cta?: string };
  status: VersionStatus;
  credits: number;
  error?: string;
  approved_at?: string | null;
  metadata?: {
    restricted_categories?: string[];
    extended_at?: string;
    recompose?: boolean;
    approval?: { at?: string; user_id?: string; channel?: string };
    [k: string]: unknown;
  };
  created_at: string;
  updated_at: string;
  edges?: { assets?: CreativeAsset[] };
}

export interface CreativeBrief {
  id: string;
  tenant_id: string;
  title: string;
  /** A snapshot of the offering when the brief was made; the owning service keeps the record. */
  offering?: Partial<Offering> & { name?: string };
  objective: Objective;
  audience?: string;
  language: "en" | "sw";
  status: "active" | "archived";
  metadata?: Record<string, unknown>;
  created_at: string;
  updated_at: string;
  edges?: { versions?: CreativeVersion[] };
}

export interface BriefInput {
  title?: string;
  offering?: Record<string, unknown>;
  objective?: Objective;
  audience?: string;
  language?: "en" | "sw";
  status?: "active" | "archived";
}

export interface VersionInput {
  prompt: string;
  format: PosterFormat;
  tier: Tier;
  headline?: string;
  subline?: string;
  price?: string;
  cta?: string;
  photo_urls?: string[];
  parent_version_id?: string;
}

export interface ReviseInput {
  headline?: string;
  subline?: string;
  price?: string;
  cta?: string;
}

export interface MotionInput {
  prompt?: string;
  /** 4 to 10, default 5. */
  seconds?: number;
  tier?: Tier;
}

/** GET /api/v1/os/creative/quote on marketflow-ai. balance -1 means unlimited or unknown. */
export interface CreativeQuote {
  tier: Tier;
  count: number;
  credits_each: number;
  credits_needed: number;
  balance: number;
  enough: boolean;
  shortfall: number;
  suggested_bundle?: { code: string; units: number; price_kes: number };
}

export interface ReviewLink {
  path: string;
  token: string;
  expires_at: string;
}

const base = "/api/v1/creative";

export const creativeApi = {
  briefs: (params: { status?: "active" | "archived"; page?: number; limit?: number }) =>
    apiClient.get<Paginated<CreativeBrief>>(`${base}/briefs`, { params }).then((r) => ({ ...r.data, data: r.data.data ?? [] })),
  brief: (id: string) => apiClient.get<CreativeBrief>(`${base}/briefs/${id}`).then((r) => r.data),
  createBrief: (data: BriefInput) => apiClient.post<CreativeBrief>(`${base}/briefs`, data).then((r) => r.data),
  updateBrief: (id: string, data: BriefInput) => apiClient.put<CreativeBrief>(`${base}/briefs/${id}`, data).then((r) => r.data),
  /** 503 when the catalogue can't be reached; the picker then takes free text. */
  offerings: (q: string) => apiClient.get<{ data: Offering[] }>(`${base}/offerings`, { params: { q } }).then((r) => r.data.data ?? []),

  makePoster: (briefId: string, data: VersionInput) => apiClient.post<CreativeVersion>(`${base}/briefs/${briefId}/versions`, data).then((r) => r.data),
  version: (id: string) => apiClient.get<CreativeVersion>(`${base}/versions/${id}`).then((r) => r.data),
  approve: (id: string) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/approve`).then((r) => r.data),
  discard: (id: string) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/discard`).then((r) => r.data),
  revise: (id: string, data: ReviseInput) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/revise`, data).then((r) => r.data),
  extend: (id: string) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/extend`).then((r) => r.data),
  motion: (id: string, data: MotionInput) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/motion`, data).then((r) => r.data),
  reviewLink: (id: string, hours: number) => apiClient.post<ReviewLink>(`${base}/versions/${id}/review-link`, { hours }).then((r) => r.data),
  revokeReviewLinks: (id: string) => apiClient.delete(`${base}/versions/${id}/review-link`).then(() => undefined),

  /** The brief's tenant is named so a platform owner working in a business sees that business's balance. */
  quote: (tenantId: string, tier: Tier, count = 1) =>
    aiClient
      .get<CreativeQuote>("/api/v1/os/creative/quote", { params: { tier, count }, headers: { "X-Tenant-ID": tenantId } })
      .then((r) => r.data),
};

/** The file people look at: the clip for a motion poster, else the poster image. */
export function mainAsset(v: CreativeVersion): CreativeAsset | undefined {
  const assets = v.edges?.assets ?? [];
  return assets.find((a) => a.kind === (v.kind === "video" ? "video" : "image")) ?? assets.find((a) => a.kind === "image");
}

/** When the draft's files go, if they are not kept forever. */
export function expiresAt(v: CreativeVersion): string | undefined {
  return mainAsset(v)?.expires_at ?? undefined;
}

export const IN_PROGRESS: VersionStatus[] = ["queued", "rendering"];

export const STATUS_LABEL: Record<VersionStatus, string> = {
  queued: "In the queue",
  rendering: "Being made",
  ready: "Waiting for review",
  failed: "Failed",
  approved: "Approved",
  rejected: "Discarded",
  superseded: "Replaced",
};

export const FORMATS: { value: PosterFormat; label: string; hint: string }[] = [
  { value: "1080x1350", label: "Portrait", hint: "Feed posts" },
  { value: "1080x1080", label: "Square", hint: "Feed and WhatsApp" },
  { value: "1080x1920", label: "Story", hint: "Stories and Status" },
];

export const OBJECTIVES: { value: Objective; label: string }[] = [
  { value: "sales", label: "Sales" },
  { value: "leads", label: "Leads" },
  { value: "awareness", label: "Awareness" },
  { value: "traffic", label: "Website visits" },
];
