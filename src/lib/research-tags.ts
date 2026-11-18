import type { ScanQuota, WinnerTags } from "@/lib/api/marketing-os";

/**
 * Owner-facing words for the fixed labels the weekly scan puts on a winning competitor ad
 * (marketflow-ai adintel/tags.go). An unknown label is shown with its underscores as spaces.
 */
const HOOKS: Record<string, string> = {
  question: "Opens with a question",
  bold_claim: "Opens with a bold claim",
  problem: "Opens with a problem",
  result: "Opens with a result",
  offer_first: "Opens with the offer",
  story: "Opens with a story",
  social_proof: "Opens with reviews",
  curiosity: "Opens with a surprise",
};

const ANGLES: Record<string, string> = {
  pain: "Pain relief",
  outcome: "Outcome",
  social_proof: "Social proof",
  comparison: "Comparison",
  identity: "Identity",
  urgency: "Urgency",
  curiosity: "Curiosity",
  price_value: "Value for money",
};

const OFFERS: Record<string, string> = {
  discount: "Discount",
  free_trial: "Free trial",
  bundle: "Bundle",
  free_delivery: "Free delivery",
  guarantee: "Guarantee",
  limited_time: "Limited time",
  new_product: "New product",
  no_offer: "No offer",
};

const words = (v: string) => v.replace(/_/g, " ");

/** The tag chips for one winner, hook first; "other" labels are left out. */
export function tagLabels(tags?: WinnerTags): string[] {
  if (!tags) return [];
  const out: string[] = [];
  if (tags.hook_type && tags.hook_type !== "other") out.push(HOOKS[tags.hook_type] ?? words(tags.hook_type));
  if (tags.angle && tags.angle !== "other") out.push(ANGLES[tags.angle] ?? words(tags.angle));
  if (tags.offer_type && tags.offer_type !== "other") out.push(OFFERS[tags.offer_type] ?? words(tags.offer_type));
  return out;
}

/** True when the scan judged the winner close to this business. */
export function isRelevant(tags?: WinnerTags): boolean {
  return tags?.relevance === "related" || tags?.relevance === "very relevant";
}

/** The tags in plain words for a draft brief, for example "it opens with a question, uses pain relief". */
export function tagsForBrief(tags?: WinnerTags): string {
  if (!tags) return "";
  const parts: string[] = [];
  if (tags.hook_type && tags.hook_type !== "other") parts.push(`opens with ${words(tags.hook_type)}`);
  if (tags.angle && tags.angle !== "other") parts.push(`uses the ${words(tags.angle)} angle`);
  if (tags.offer_type && tags.offer_type !== "other" && tags.offer_type !== "no_offer") parts.push(`offers ${words(tags.offer_type)}`);
  return parts.join(", ");
}

/** "3 of 5 competitor searches left in November" or null when the budget is unknown. */
export function quotaLine(quota: ScanQuota | null | undefined): string | null {
  if (!quota) return null;
  const { tenant_left, tenant_limit } = quota.scan;
  const [y, m] = quota.month.split("-").map(Number);
  const month = y && m ? new Date(Date.UTC(y, m - 1, 1)).toLocaleString("en-GB", { month: "long", timeZone: "UTC" }) : "this month";
  if (tenant_left <= 0) return `Competitor searches for ${month} are used. They resume on the 1st; earlier results stay.`;
  return `${tenant_left} of ${tenant_limit} competitor searches left in ${month}.`;
}
