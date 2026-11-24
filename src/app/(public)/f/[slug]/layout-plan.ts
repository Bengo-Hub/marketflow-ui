import type { FunnelStep } from "./types";

/** A step's block type: the saved one, else a form when it has fields, else content. */
export function blockType(step: FunnelStep) {
  return step.block_type ?? ((step.fields?.length ?? 0) > 0 ? "form" : "content");
}

/**
 * The step that carries the page's one main call to action: the first form, else the first
 * WhatsApp, booking, product or recruit block. -1 when the funnel has none (the page then shows
 * the default lead form as the main action).
 */
export function primaryStepIndex(steps: FunnelStep[]): number {
  const form = steps.findIndex((s) => blockType(s) === "form");
  if (form >= 0) return form;
  return steps.findIndex((s) => ["whatsapp", "google_calendar", "product", "recruit"].includes(blockType(s)));
}

/**
 * The funnel description as a lead paragraph plus a benefit list: lines that start with a bullet
 * ("-", "*", a bullet dot or a tick) become benefits, the other lines stay as the paragraph.
 */
export function splitBenefits(description?: string): { intro: string; benefits: string[] } {
  const intro: string[] = [];
  const benefits: string[] = [];
  for (const raw of (description ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    const m = line.match(/^(?:[-*•✓✔]|\d+[.)])\s+(.+)$/);
    if (m) benefits.push(m[1].trim());
    else intro.push(line);
  }
  return { intro: intro.join(" "), benefits };
}

/** Stars only for a real rating (unrated website quotes come back as 0). */
export function starCount(rating: number): number {
  return Number.isFinite(rating) ? Math.max(0, Math.min(5, Math.round(rating))) : 0;
}
