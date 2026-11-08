import { aiClient, apiClient } from "./client";
import type { CreativeVersion, PosterFormat } from "./creative";

/**
 * Video ads in the studio (Sprint 15): a script first, then for a presenter ad the
 * storyboard, then the paid render, and a scene-by-scene revision that reuses every
 * unchanged scene. Contract: marketflow/docs/sprint-plans/sprint-15-creative-studio.md.
 */

const base = "/api/v1/creative";

export type VideoKind = "template" | "presenter" | "presenter_premium";
export type Shot = "presenter" | "product_clip" | "b_roll" | "owner_footage" | "end_card";
export type Delivery = "ad" | "ugc" | "kids" | "story" | "info";

export interface VideoAdInput {
  kind: VideoKind;
  format: PosterFormat;
  seconds: number;
  language: "en" | "sw";
  voice?: string;
  delivery?: Delivery;
  voice_gender?: "female" | "male";
  voice_accent?: string;
  actor_prompt?: string;
  photo_urls?: string[];
  footage_urls?: string[];
  cta?: string;
  /** Optional music bed (https). music_licensed must confirm the right to use it in ads. */
  music_url?: string;
  music_licensed?: boolean;
}

export interface ScriptScene {
  id: string;
  shot: Shot;
  asset?: number;
  visual?: string;
  voiceover: string;
  caption: string;
  duration_s?: number;
}

export interface VideoScript {
  format?: string;
  hooks?: string[];
  scenes: ScriptScene[];
  cta?: string;
}

export interface EndCard {
  headline?: string;
  subline?: string;
  price?: string;
  cta?: string;
}

export interface StoryboardStill {
  scene_id: string;
  url?: string;
  source: "actor" | "photo" | "generated" | "footage";
}

export interface Storyboard {
  actor?: { url: string; prompt: string; seed: number };
  stills: StoryboardStill[];
  made_at?: string;
  approved_at?: string;
}

export interface Finding {
  quote?: string;
  issue: string;
  severity?: string;
  fix?: string;
}

export interface ScenePlan {
  scene_id: string;
  shot: Shot;
  work: "presenter" | "clip" | "still" | "footage";
  cached: boolean;
  seconds: number;
  route?: string;
  cost_usd: number;
}

export interface VideoAdQuote {
  credits_needed: number;
  balance: number;
  enough: boolean;
  shortfall?: number;
  suggested_bundle?: { code: string; units: number; price_kes: number };
  plan?: { kind: VideoKind; scenes?: ScenePlan[]; cached_scenes?: number };
}

export interface Voice {
  voice_id: string;
  name: string;
  accent?: string;
  gender?: string;
  in_collection?: boolean;
}

export interface DeliveryOption {
  key: Delivery;
  name: string;
}

/** The parts of a video ad version the studio reads. */
export function videoParts(v: CreativeVersion) {
  const copy = (v.copy ?? {}) as { script?: VideoScript; end_card?: EndCard };
  const meta = (v.metadata ?? {}) as {
    stage?: string;
    video_kind?: VideoKind;
    storyboard?: Storyboard;
    storyboard_error?: string;
    findings?: Finding[];
    scene_cache?: unknown[];
    photo_urls?: string[];
  };
  return {
    script: copy.script,
    endCard: copy.end_card ?? {},
    kind: meta.video_kind ?? "template",
    stage: meta.stage ?? "script",
    storyboard: meta.storyboard,
    storyboardError: meta.storyboard_error,
    findings: meta.findings ?? [],
    photos: meta.photo_urls ?? [],
  };
}

export const videoAdsApi = {
  create: (briefId: string, data: VideoAdInput) =>
    apiClient.post<CreativeVersion>(`${base}/briefs/${briefId}/video-ads`, data).then((r) => r.data),
  saveScript: (id: string, data: { script?: VideoScript; end_card?: EndCard }) =>
    apiClient.put<CreativeVersion>(`${base}/versions/${id}/script`, data).then((r) => r.data),
  storyboard: (id: string) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/storyboard`).then((r) => r.data),
  approveStoryboard: (id: string) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/storyboard/approve`).then((r) => r.data),
  quote: (id: string) => apiClient.get<VideoAdQuote>(`${base}/versions/${id}/quote`).then((r) => r.data),
  render: (id: string) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/render`).then((r) => r.data),
  revision: (id: string) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/revision`).then((r) => r.data),
  voices: () =>
    aiClient.get<{ voices: Voice[]; deliveries: DeliveryOption[] }>("/api/v1/os/creative/voices").then((r) => r.data),
};

export const VIDEO_KINDS: { value: VideoKind; label: string; hint: string }[] = [
  { value: "template", label: "Your photos", hint: "Your photos and clips with a voice-over. About 12 credits for 30 s." },
  { value: "presenter", label: "Presenter", hint: "A presenter talks to camera; product scenes move. Priced scene by scene." },
  { value: "presenter_premium", label: "Premium presenter", hint: "Sharper presenter video at 720p. Priced scene by scene." },
];

export const SHOT_LABEL: Record<Shot, string> = {
  presenter: "Presenter",
  product_clip: "Product",
  b_roll: "Scene",
  owner_footage: "Your clip",
  end_card: "End card",
};

export const DELIVERIES: { value: Delivery; label: string }[] = [
  { value: "ad", label: "Advert" },
  { value: "ugc", label: "Casual" },
  { value: "kids", label: "Kids" },
  { value: "story", label: "Story" },
  { value: "info", label: "Explainer" },
];
