import { apiClient } from "./client";

/** One person's consent record to be the model for the business's AI presenter. */
export interface BrandFace {
  id: string;
  image_id: string;
  name: string;
  use: string;
  until: string;
  recorded_by: string;
  recorded_at: string;
  ended_at?: string;
  ended_by?: string;
  end_reason?: string;
  /** May be used now. */
  live: boolean;
}

/** GET /api/v1/tenant/brand-faces. */
export interface BrandFaces {
  /** The platform's switch. */
  available: boolean;
  /** The business's own opt-in. */
  on: boolean;
  max_faces: number;
  max_days: number;
  /** What the admin confirms, word for word. */
  statement: string;
  faces: BrandFace[];
}

export interface BrandFaceInput {
  image_id: string;
  name: string;
  /** YYYY-MM-DD; the consent holds through that day. */
  until: string;
  under_18: boolean;
  agreed: boolean;
}

const path = "/api/v1/tenant/brand-faces";

export const brandFacesApi = {
  list: () => apiClient.get<BrandFaces>(path).then((r) => ({ ...r.data, faces: r.data.faces ?? [] })),
  switch: (on: boolean) => apiClient.put<BrandFaces>(path, { on }).then((r) => r.data),
  add: (input: BrandFaceInput) => apiClient.post<BrandFace>(path, { ...input, use: "presenter" }).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`${path}/${encodeURIComponent(id)}`).then(() => undefined),
};

/** Why a face cannot be recorded yet, or null. under18 is null until it is answered. */
export function faceFormProblem(f: { imageId: string; name: string; until: string; under18: boolean | null; agreed: boolean }, today: string): string | null {
  if (!f.imageId) return "Pick the picture.";
  if (f.name.trim().length < 2) return "Give the person's name or a label.";
  if (!f.until || f.until < today) return "Pick the date the consent ends.";
  if (f.under18 === null) return "Say whether the person is under 18.";
  if (f.under18) return "A picture of someone under 18 is never used.";
  if (!f.agreed) return "Confirm that the person agreed.";
  return null;
}
