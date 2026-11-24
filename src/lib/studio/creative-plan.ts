import type { CreativePlan, PlanOption } from "@/lib/api/marketing-os";

/**
 * The Studio form's Creative Plan step (Sprint 15): the owner sizes the job before anything is
 * made, with marketflow-ai's quote (POST /api/v1/os/plan/quote, the same Creative Plan the
 * Marketing Manager shows). The chosen option is kept on the brief as metadata.plan. It is a
 * record of what the owner planned; every render is still priced and charged when it is made.
 */

/** The quote's input (marketflow-ai registry.PlanInput). */
export interface PlanQuoteInput {
  ad_budget_kes: number;
  days: number;
  platforms: string[];
  tier: string;
}

/** The media outputs the form offers, by registry key. */
export const PLAN_TIERS: { value: string; label: string }[] = [
  { value: "poster", label: "Poster" },
  { value: "poster_premium", label: "Premium poster" },
  { value: "motion_poster_5s", label: "Motion poster, 5 s" },
  { value: "template_video_30s", label: "Video ad, 30 s" },
  { value: "presenter_30s", label: "Presenter ad, 30 s" },
];

/** Where the ads run. TikTok waits for its Business API access, so it is not offered yet. */
export const PLAN_PLATFORMS: { value: string; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "whatsapp", label: "WhatsApp" },
];

export const DEFAULT_PLAN_INPUT: PlanQuoteInput = { ad_budget_kes: 0, days: 7, platforms: ["facebook"], tier: "poster" };

/** What stops the quote, as marketflow-ai's own checks: a whole budget of 0 or more, 1 to 366 days, a platform, a known output. */
export function planInputProblems(in_: PlanQuoteInput): string[] {
  const out: string[] = [];
  if (!Number.isFinite(in_.ad_budget_kes) || in_.ad_budget_kes < 0 || !Number.isInteger(in_.ad_budget_kes)) {
    out.push("Enter the ad budget as a whole amount, 0 for no paid ads.");
  }
  if (!Number.isInteger(in_.days) || in_.days < 1 || in_.days > 366) out.push("The period is 1 to 366 days.");
  if (in_.platforms.length === 0) out.push("Choose at least one place for the ads.");
  if (!PLAN_TIERS.some((t) => t.value === in_.tier)) out.push("Choose what to make.");
  return out;
}

/**
 * The budget as the owner typed it. The plan engine prices in KES, so a budget in the tenant's
 * own currency is converted with treasury's rate (marketflow-api GET /tenant/profile/kes-rate)
 * before the quote, and the brief keeps what was typed beside the KES amount.
 */
export interface PlanBudgetEntry {
  amount: number;
  currency: string;
  /** KES per unit of currency used for the conversion (1 for KES). */
  kes_per: number;
}

/** Where the rate for the tenant's currency stands. */
export type PlanRateState = { status: "loading" } | { status: "ready"; kesPer: number } | { status: "missing" };

/**
 * The currency the budget is typed in: the tenant's own when it is KES or treasury has a rate,
 * else KES (the plan engine's currency), with a note saying why.
 */
export function planBudgetCurrency(tenantCurrency: string, rate: PlanRateState): { currency: string; note?: string } {
  const cur = (tenantCurrency || "KES").toUpperCase();
  if (cur === "KES") return { currency: "KES" };
  if (rate.status === "missing") {
    return { currency: "KES", note: `There is no ${cur} exchange rate right now, so enter the budget in KES.` };
  }
  return { currency: cur };
}

/** The KES amount for the quote: whole KES, NaN when there is no usable rate or amount. */
export function budgetToKES(amount: number | null, currency: string, kesPer: number | undefined): number {
  if (amount == null || !Number.isFinite(amount)) return Number.NaN;
  if (currency.toUpperCase() === "KES") return Math.round(amount);
  if (!kesPer || !Number.isFinite(kesPer) || kesPer <= 0) return Number.NaN;
  return Math.round(amount * kesPer);
}

/** The plan's options in the order shown: the recommended one first. */
export function planOptions(plan: CreativePlan): PlanOption[] {
  return [plan.recommended, ...(plan.alternatives ?? [])];
}

/** What the brief keeps as metadata.plan: the input, the chosen option and the quote's context. */
export interface BriefPlan {
  input: PlanQuoteInput;
  option: PlanOption;
  recommended: boolean;
  credits_available: number;
  shortfall: number;
  max_live_ads: number;
  daily_per_ad_kes?: number;
  notes?: string[];
  /** The budget as typed when it was not KES (input.ad_budget_kes is its KES amount). */
  budget_entry?: PlanBudgetEntry;
  quoted_at: string;
}

/** The metadata.plan for the option at index (0 is the recommended one); null for an index out of range. */
export function briefPlan(
  plan: CreativePlan,
  index: number,
  input: PlanQuoteInput,
  now: Date = new Date(),
  entry?: PlanBudgetEntry,
): BriefPlan | null {
  const option = planOptions(plan)[index];
  if (!option) return null;
  return {
    ...(entry && entry.currency.toUpperCase() !== "KES" ? { budget_entry: entry } : {}),
    input,
    option,
    recommended: index === 0,
    credits_available: plan.credits_available,
    shortfall: plan.shortfall,
    max_live_ads: plan.max_live_ads,
    ...(plan.daily_per_ad_kes ? { daily_per_ad_kes: plan.daily_per_ad_kes } : {}),
    ...(plan.notes?.length ? { notes: plan.notes } : {}),
    quoted_at: now.toISOString(),
  };
}

/** One line about an option's price against the balance. */
export function optionPriceLine(option: PlanOption, creditsAvailable: number): string {
  const price = `${option.credits} credit${option.credits === 1 ? "" : "s"}`;
  if (creditsAvailable < 0) return price;
  return option.affordable ? `${price}, within your balance of ${creditsAvailable}` : `${price}, more than your balance of ${creditsAvailable}`;
}
