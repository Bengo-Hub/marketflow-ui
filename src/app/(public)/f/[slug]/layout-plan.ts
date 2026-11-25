import type { FunnelField, FunnelStep } from "./types";

/** The lead form of a funnel that has none of its own, or whose form step has no fields. */
export const DEFAULT_LEAD_FIELDS: FunnelField[] = [
  { key: "first_name", label: "Name", required: true },
  { key: "phone", label: "Phone or WhatsApp", type: "tel", required: true },
  { key: "email", label: "Email", type: "email" },
  { key: "interest", label: "What are you interested in?", type: "textarea" },
];

/** The form's fields; a form saved without any still asks how to reach the person. */
export function formFields(step: FunnelStep): FunnelField[] {
  return step.fields && step.fields.length > 0 ? step.fields : DEFAULT_LEAD_FIELDS;
}

/**
 * Whether the page shows the default lead form: the funnel has no form and no action block, so
 * without it a visitor could not leave their details (a funnel with content steps only).
 */
export function needsDefaultForm(steps: FunnelStep[]): boolean {
  return primaryStepIndex(steps) < 0;
}

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
