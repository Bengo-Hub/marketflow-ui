/**
 * The owner's AI label choice (owner 2026-11-14), kept in tenant metadata as ai_label "on" or "off"
 * (marketflow-api creative.AILabelKey). On, the default, videos with an AI presenter show an
 * "AI-generated" note and every post (scheduled in the Studio or by an agent) carries each
 * platform's AI label. Off, both are left out. Only owners and admins change it. The scripts
 * never claim an AI presenter is a real customer or a real person either way.
 */

export const AI_LABEL_EXPLANATION =
  "Mark your posts as AI-made with each platform's own label. Some platforms require it; you are responsible for following their rules.";

/** Anything but "off" is on, so an unset value keeps the label. */
export function aiLabelOn(meta: Record<string, unknown> | undefined): boolean {
  const v = meta?.ai_label;
  return !(typeof v === "string" && v.trim().toLowerCase() === "off");
}

/** The profile metadata patch that saves the choice. */
export function aiLabelPatch(on: boolean): { ai_label: "on" | "off" } {
  return { ai_label: on ? "on" : "off" };
}

export const AI_TEXT_EXPLANATION =
  "Draw a small 'AI-generated' line on videos with an AI presenter. Off by default. Posts still carry each platform's own AI label.";

/** The on-screen note (marketflow-api creative.AILabelTextKey): off unless the owner turned it on. */
export function aiTextOn(meta: Record<string, unknown> | undefined): boolean {
  const v = meta?.ai_label_text;
  return aiLabelOn(meta) && typeof v === "string" && v.trim().toLowerCase() === "on";
}

export function aiTextPatch(on: boolean): { ai_label_text: "on" | "off" } {
  return { ai_label_text: on ? "on" : "off" };
}
