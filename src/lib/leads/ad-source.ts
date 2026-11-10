/** Which ad a lead came from, in a few words, from what the API stores in its metadata (Sprint 18). */
export function leadAdSource(lead: { metadata?: Record<string, unknown> }): string {
  const m = lead.metadata ?? {};
  const has = (k: string) => typeof m[k] === "string" && (m[k] as string) !== "";
  let label = "";
  if (has("meta_ad_id") || has("adset_id") || has("meta_form_id")) label = "Meta ad";
  else if (has("ttclid")) label = "TikTok ad click";
  else if (has("gclid")) label = "Google ad click";
  else if (has("fbclid")) label = "Facebook ad click";
  if (label && has("creative_version_id")) label += " · creative";
  return label;
}
