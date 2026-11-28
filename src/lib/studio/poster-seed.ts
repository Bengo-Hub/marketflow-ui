import type { PosterFormat } from "@/lib/api/creative";

/**
 * The words a Studio poster starts from when the marketing team wrote a poster brief
 * (owner, 2026-11-28: a poster brief from "Ask" had no way into the poster maker). Kept on the
 * new brief as metadata.poster_seed and read by PosterForm.
 */
export interface PosterSeed {
  prompt: string;
  headline: string;
  subline: string;
  cta: string;
  format: PosterFormat;
}

const FORMATS: PosterFormat[] = ["1920x1080", "1080x1080", "1080x1350", "1080x1920"];

// "[NEED: owner's town ...]" marks a fact the team did not have; the owner fills it in the form.
const NEED = /\s*\[NEED:[^\]]*\]\.?/gi;

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(NEED, "").trim().slice(0, max) : "";
}

/** posterSeed reads a poster_brief step's output; null when it has no picture to make. */
export function posterSeed(output: unknown): PosterSeed | null {
  if (!output || typeof output !== "object") return null;
  const o = output as Record<string, unknown>;
  const prompt = str(o.image_prompt, 2000);
  if (!prompt) return null;
  const sizes = Array.isArray(o.sizes) ? o.sizes : [];
  const format = (sizes.find((s) => FORMATS.includes(s as PosterFormat)) as PosterFormat | undefined) ?? "1080x1080";
  return { prompt, headline: str(o.headline, 200), subline: str(o.subline, 200), cta: str(o.cta, 200), format };
}

/** readSeed returns a brief's stored seed, if any. */
export function readSeed(metadata: Record<string, unknown> | undefined): PosterSeed | null {
  const s = metadata?.poster_seed;
  return s && typeof s === "object" ? posterSeed({ ...(s as object), image_prompt: (s as PosterSeed).prompt, sizes: [(s as PosterSeed).format] }) : null;
}
