import { describe, expect, it } from "vitest";
import type { CreativePlan, PlanOption } from "@/lib/api/marketing-os";
import {
  briefPlan,
  budgetToKES,
  DEFAULT_PLAN_INPUT,
  optionPriceLine,
  planBudgetCurrency,
  planInputProblems,
  planOptions,
} from "./creative-plan";

const option = (over: Partial<PlanOption> = {}): PlanOption => ({
  label: "Test 4, make 2",
  variants: 4,
  shortlist: 2,
  tier: "poster",
  lines: [{ key: "poster", name: "Poster", qty: 2, credits: 6 }],
  credits: 8,
  affordable: true,
  description: "Write 4 ads, make the best 2 as posters.",
  ...over,
});

const plan = (over: Partial<CreativePlan> = {}): CreativePlan => ({
  recommended: option(),
  alternatives: [option({ label: "Cheaper", credits: 4, variants: 2, shortlist: 1 })],
  max_live_ads: 2,
  max_renders: 3,
  daily_per_ad_kes: 350,
  ad_budget_kes: 4900,
  days: 7,
  credits_available: 20,
  shortfall: 0,
  ...over,
});

describe("Creative Plan step", () => {
  it("accepts the default input", () => {
    expect(planInputProblems(DEFAULT_PLAN_INPUT)).toEqual([]);
  });

  it("refuses what marketflow-ai's quote refuses", () => {
    expect(planInputProblems({ ...DEFAULT_PLAN_INPUT, ad_budget_kes: -1 })).toHaveLength(1);
    expect(planInputProblems({ ...DEFAULT_PLAN_INPUT, ad_budget_kes: 100.5 })).toHaveLength(1);
    expect(planInputProblems({ ...DEFAULT_PLAN_INPUT, ad_budget_kes: Number.NaN })).toHaveLength(1);
    expect(planInputProblems({ ...DEFAULT_PLAN_INPUT, days: 0 })[0]).toMatch(/1 to 366/);
    expect(planInputProblems({ ...DEFAULT_PLAN_INPUT, days: 367 })[0]).toMatch(/1 to 366/);
    expect(planInputProblems({ ...DEFAULT_PLAN_INPUT, platforms: [] })[0]).toMatch(/at least one/);
    expect(planInputProblems({ ...DEFAULT_PLAN_INPUT, tier: "hologram" })[0]).toMatch(/what to make/);
  });

  it("lists the recommended option first", () => {
    const opts = planOptions(plan());
    expect(opts).toHaveLength(2);
    expect(opts[0].label).toBe("Test 4, make 2");
    expect(planOptions(plan({ alternatives: [] }))).toHaveLength(1);
  });

  it("keeps the chosen option, the input and the quote's context on the brief", () => {
    const now = new Date("2026-11-18T09:00:00Z");
    const input = { ...DEFAULT_PLAN_INPUT, ad_budget_kes: 4900 };
    const rec = briefPlan(plan(), 0, input, now)!;
    expect(rec).toMatchObject({ input, recommended: true, credits_available: 20, shortfall: 0, max_live_ads: 2, daily_per_ad_kes: 350, quoted_at: now.toISOString() });
    expect(rec.option.credits).toBe(8);
    const alt = briefPlan(plan(), 1, input, now)!;
    expect(alt.recommended).toBe(false);
    expect(alt.option.label).toBe("Cheaper");
    expect(briefPlan(plan(), 2, input, now)).toBeNull();
  });

  it("leaves out empty extras", () => {
    const rec = briefPlan(plan({ daily_per_ad_kes: undefined, notes: [] }), 0, DEFAULT_PLAN_INPUT)!;
    expect("daily_per_ad_kes" in rec).toBe(false);
    expect("notes" in rec).toBe(false);
  });

  it("takes the budget in the tenant's currency when treasury has a rate, else KES", () => {
    expect(planBudgetCurrency("KES", { status: "missing" })).toEqual({ currency: "KES" });
    expect(planBudgetCurrency("usd", { status: "ready", kesPer: 129.5 })).toEqual({ currency: "USD" });
    expect(planBudgetCurrency("USD", { status: "loading" })).toEqual({ currency: "USD" });
    const missing = planBudgetCurrency("UGX", { status: "missing" });
    expect(missing.currency).toBe("KES");
    expect(missing.note).toMatch(/no UGX exchange rate/);
  });

  it("converts the budget to whole KES for the plan engine", () => {
    expect(budgetToKES(100, "USD", 129.5)).toBe(12950);
    expect(budgetToKES(100_000, "UGX", 0.0348)).toBe(3480);
    expect(budgetToKES(4900, "KES", undefined)).toBe(4900);
    expect(budgetToKES(0, "USD", 129.5)).toBe(0);
    expect(budgetToKES(100, "USD", undefined)).toBeNaN();
    expect(budgetToKES(null, "KES", 1)).toBeNaN();
  });

  it("keeps the typed budget on the brief only when it was not KES", () => {
    const input = { ...DEFAULT_PLAN_INPUT, ad_budget_kes: 12950 };
    const usd = briefPlan(plan(), 0, input, new Date(), { amount: 100, currency: "USD", kes_per: 129.5 })!;
    expect(usd.budget_entry).toEqual({ amount: 100, currency: "USD", kes_per: 129.5 });
    expect(usd.input.ad_budget_kes).toBe(12950);
    const kes = briefPlan(plan(), 0, input, new Date(), { amount: 12950, currency: "KES", kes_per: 1 })!;
    expect("budget_entry" in kes).toBe(false);
  });

  it("says how an option's price sits against the balance", () => {
    expect(optionPriceLine(option({ credits: 8, affordable: true }), 20)).toBe("8 credits, within your balance of 20");
    expect(optionPriceLine(option({ credits: 1, affordable: false }), 0)).toBe("1 credit, more than your balance of 0");
    expect(optionPriceLine(option({ credits: 8 }), -1)).toBe("8 credits");
  });
});
