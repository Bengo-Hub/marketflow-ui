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
  /** Omitted: the tenant's default video size, else the platform's (1920x1080). */
  format?: PosterFormat;
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
  /** The ad template the script follows (GET /creative/ad-templates); empty lets the writer choose. */
  approach?: string;
}

/** Who reads a line in a two-voice casual (UGC) ad; empty is the ad's one voice. */
export type Speaker = "" | "male" | "female";

export interface ScriptScene {
  id: string;
  shot: Shot;
  asset?: number;
  visual?: string;
  voiceover: string;
  caption: string;
  duration_s?: number;
  speaker?: Speaker;
  /** Where the scene happens, from the setting brief (place, neighbourhood, vibe, people, props). */
  setting?: string;
}

export interface VideoScript {
  format?: string;
  hooks?: string[];
  scenes: ScriptScene[];
  cta?: string;
  /** The ad template the writer followed. */
  approach?: string;
}

/** One ad template from marketflow-ai's library (the list is data, never hard-coded here). */
export interface AdTemplate {
  key: string;
  name: string;
  when_to_use: string;
  /** The video kinds it suits: template, presenter, ugc. */
  kinds: string[];
  two_voice: boolean;
  /** Facts it needs before it can be used: real_reviews, founder_story. */
  requires?: string[];
}

export interface AdTemplateList {
  templates: AdTemplate[];
  defaults: Record<string, string>;
}

/** The template library's kind for a video: a casual (UGC) delivery, a presenter, or photos. */
export function templateKind(kind: VideoKind, delivery: Delivery): "ugc" | "presenter" | "template" {
  if (delivery === "ugc") return "ugc";
  return kind === "template" ? "template" : "presenter";
}

/** The templates that suit a video, in library order. */
export function templatesFor(list: AdTemplate[], kind: VideoKind, delivery: Delivery): AdTemplate[] {
  const k = templateKind(kind, delivery);
  return list.filter((t) => t.kinds.includes(k));
}

/** A script uses two voices when its spoken lines name both a male and a female speaker. */
export function isTwoVoice(scenes: ScriptScene[]): boolean {
  const who = new Set(scenes.filter((s) => s.voiceover.trim() !== "" && s.speaker).map((s) => s.speaker));
  return who.has("male") && who.has("female");
}

export interface EndCard {
  headline?: string;
  subline?: string;
  price?: string;
  cta?: string;
}

export type FrameSource = "actor" | "photo" | "generated" | "footage";

export interface StoryboardStill {
  scene_id: string;
  url?: string;
  source: FrameSource;
  /** For a photo frame: which photo, and whether it is the offering's own or a matched brand picture. */
  photo?: number;
  origin?: "offering" | "library";
  /** For a generated still: the exact prompt it was drawn from. */
  prompt?: string;
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
  /** The generation plan: the first frame and the exact prompts the route is sent. */
  frame?: FrameSource;
  frame_url?: string;
  photo?: number;
  origin?: "offering" | "library";
  prompt?: string;
  negative_prompt?: string;
  still_prompt?: string;
  /** The scene's own tier when it differs by scene (premium with a standard fallback). */
  tier?: "standard" | "premium";
}

export interface VideoAdQuote {
  credits_needed: number;
  balance: number;
  enough: boolean;
  shortfall?: number;
  suggested_bundle?: { code: string; units: number; price_kes: number };
  plan?: { kind: VideoKind; scenes?: ScenePlan[]; cached_scenes?: number; cost_usd?: number };
  /** The per-video provider-cost ceiling in force (platform setting), in USD. */
  max_video_usd?: number;
  /** Names the plan this quote shows; approving it lets the render start. */
  plan_fingerprint?: string;
  plan_approved?: boolean;
}

/** Where a scene's first frame comes from, in the owner's words. */
export function frameLabel(s: Pick<ScenePlan, "frame" | "origin" | "photo">): string {
  switch (s.frame) {
    case "actor":
      return "The presenter";
    case "footage":
      return "Your video";
    case "photo":
      return s.origin === "library" ? `Brand picture ${s.photo ?? ""}`.trim() : `Product photo ${s.photo ?? ""}`.trim();
    default:
      return "New picture made for the scene";
  }
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
    delivery?: Delivery;
    /** A two-voice ad's voices by speaker (male, female). */
    voices_used?: Partial<Record<"male" | "female", string>>;
    two_voice_note?: string;
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
    delivery: meta.delivery ?? "ad",
    voicesUsed: meta.voices_used ?? {},
    twoVoiceNote: meta.two_voice_note ?? "",
  };
}

export const videoAdsApi = {
  create: (briefId: string, data: VideoAdInput) =>
    apiClient.post<CreativeVersion>(`${base}/briefs/${briefId}/video-ads`, data).then((r) => r.data),
  saveScript: (id: string, data: { script?: VideoScript; end_card?: EndCard }) =>
    apiClient.put<CreativeVersion>(`${base}/versions/${id}/script`, data).then((r) => r.data),
  storyboard: (id: string) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/storyboard`).then((r) => r.data),
  /** A new storyboard with a newly drawn presenter (optionally from a new description). */
  redrawActor: ({ id, actorPrompt }: { id: string; actorPrompt?: string }) =>
    apiClient
      .post<CreativeVersion>(`${base}/versions/${id}/storyboard`, { redraw_actor: true, actor_prompt: actorPrompt || undefined })
      .then((r) => r.data),
  approveStoryboard: (id: string) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/storyboard/approve`).then((r) => r.data),
  /** The end card preview made again over its own still: new words, contacts or logo plate, nothing redrawn or charged. */
  recomposeEndCard: (id: string) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/end-card-preview`).then((r) => r.data),
  /** Places the scenes again from the current address and landmarks; only moved scenes are drawn again. */
  resetSettings: (id: string) =>
    apiClient.post<{ version: CreativeVersion; changed: number }>(`${base}/versions/${id}/settings`).then((r) => r.data),
  /** Approves the generation plan the quote showed (and the storyboard with it). */
  approvePlan: ({ id, fingerprint }: { id: string; fingerprint: string }) =>
    apiClient.post<CreativeVersion>(`${base}/versions/${id}/storyboard/approve`, { plan_fingerprint: fingerprint }).then((r) => r.data),
  quote: (id: string) => apiClient.get<VideoAdQuote>(`${base}/versions/${id}/quote`).then((r) => r.data),
  render: (id: string) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/render`).then((r) => r.data),
  revision: (id: string) => apiClient.post<CreativeVersion>(`${base}/versions/${id}/revision`).then((r) => r.data),
  voices: () =>
    aiClient.get<{ voices: Voice[]; deliveries: DeliveryOption[] }>("/api/v1/os/creative/voices").then((r) => r.data),
  adTemplates: () =>
    apiClient.get<AdTemplateList>(`${base}/ad-templates`).then((r) => ({ templates: r.data.templates ?? [], defaults: r.data.defaults ?? {} })),
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
