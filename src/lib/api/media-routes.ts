import { apiClient } from "@/lib/api/client";

/**
 * The model behind each media tier (marketflow-api admin/media_routes.go): platform setting
 * media/routes, one key per tier. An unset key runs the tier's default in marketflow-ai.
 */
export type MediaRoute = {
  key: string;
  label: string;
  /** The provider card that edits it. */
  card: "fal" | "elevenlabs";
  /** fal: a fal endpoint id; elevenlabs: an ElevenLabs model id; flag: "true" or "false". */
  kind: "fal" | "elevenlabs" | "flag";
  /** fal categories that fit the tier, for the picker. */
  categories?: string[];
  default: string;
  help?: string;
  legacy?: string;
  /** The saved setting ("" when the tier runs its default). */
  value: string;
  /** What runs now. */
  effective: string;
  /** The value the last change replaced, for revert. */
  previous?: string;
};

export type FalPrice = { unit_price: number; unit: string; currency: string };

/** A tier moved to a newer model of its family by Sync models. */
export type RouteSwitch = { key: string; label: string; from: string; to: string };

export async function getMediaRoutes(card: string): Promise<MediaRoute[]> {
  const r = await apiClient.get<{ routes: MediaRoute[] }>(`/api/v1/admin/providers/media-routes?card=${encodeURIComponent(card)}`);
  return r.data.routes ?? [];
}

/** Merges the keys sent; every other key stays. An empty value resets that tier to its default. */
export async function patchMediaRoutes(settings: Record<string, string>): Promise<MediaRoute[]> {
  const r = await apiClient.patch<{ routes: MediaRoute[] }>(`/api/v1/admin/providers/media-routes`, { settings });
  return r.data.routes ?? [];
}

export async function getFalPrices(ids: string[]): Promise<Record<string, FalPrice>> {
  if (ids.length === 0) return {};
  const r = await apiClient.get<{ prices: Record<string, FalPrice> }>(
    `/api/v1/admin/providers/fal-pricing?ids=${encodeURIComponent(ids.join(","))}`,
  );
  return r.data.prices ?? {};
}

/** "USD 0.08 per 1000 characters". */
export function formatPrice(p?: FalPrice): string | undefined {
  if (!p) return undefined;
  const unit = /^\d/.test(p.unit) ? p.unit : `1 ${p.unit.replace(/s$/, "")}`;
  return `${p.currency || "USD"} ${p.unit_price} per ${unit}`;
}

/** The Sync models recommendation field that describes each tier (modelcatalog DefaultRoles). */
export const RECOMMENDATION_FOR: Record<string, string> = {
  "media.route.poster_premium": "image_premium",
  "media.route.poster_standard": "image_standard",
  "media.route.video_premium": "video_premium",
  "media.route.video_standard": "video_standard",
  // The "presenter" role spans Boreal and Fabric (two tiers here), so it shows in the card's
  // "Newest model per tier" list only.
  "media.route.voice_premium": "voice_premium_model",
  "media.route.voice_standard": "voice_model",
};
