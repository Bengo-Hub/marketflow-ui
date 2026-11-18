import type { AutopilotConfig } from "@/lib/api/autopilot";

/**
 * The rule triggers an ad autopilot agent can opt in to (marketflow-api worker: new_item_ads.go and
 * testimonial_ads.go). Each one makes at most one extra draft a day, and every draft uses credits.
 */
export const RULE_TRIGGERS = [
  {
    key: "new_item_drafts",
    label: "Draft an ad when a new product is added",
    help: "At most one extra draft a day, only for products with a photo. Each draft uses credits and counts toward your monthly limit.",
  },
  {
    key: "testimonial_drafts",
    label: "Draft an ad when a good review is published",
    help: "At most one extra draft a day, when a review rated 4 or 5 (or unrated) is published. The ad can quote your best reviews. Each draft uses credits and counts toward your monthly limit.",
  },
] as const;

export type RuleTriggerKey = (typeof RULE_TRIGGERS)[number]["key"];

/** The switches as saved, all off when the agent has no setting yet. */
export function ruleTriggers(cfg?: Partial<AutopilotConfig> | null): Record<RuleTriggerKey, boolean> {
  return {
    new_item_drafts: cfg?.new_item_drafts ?? false,
    testimonial_drafts: cfg?.testimonial_drafts ?? false,
  };
}
