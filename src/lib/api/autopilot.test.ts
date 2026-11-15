import { describe, expect, it } from "vitest";
import { clampStopDays, isISODate, paidBudgetProblems, type PaidBudget } from "./autopilot";

describe("autopilot CPL stop (Sprint 20)", () => {
  it("keeps the window within 1 to 14 days", () => {
    expect(clampStopDays(3)).toBe(3);
    expect(clampStopDays(0)).toBe(3);
    expect(clampStopDays(Number.NaN)).toBe(3);
    expect(clampStopDays(30)).toBe(14);
    expect(clampStopDays(2.4)).toBe(2);
  });
});

describe("autopilot paid budget (Sprint 20), as the API's Validate", () => {
  const ok: PaidBudget = { paid: true, per_ad_budget: 2000, period_days: 7, monthly_ad_ceiling: 10000, end_date: "" };

  it("accepts a whole budget within the ceiling", () => {
    expect(paidBudgetProblems(ok)).toEqual([]);
    expect(paidBudgetProblems({ ...ok, per_ad_budget: 10000 })).toEqual([]);
  });

  it("checks nothing of the budget for an organic agent", () => {
    expect(paidBudgetProblems({ paid: false, per_ad_budget: 0, period_days: 0, monthly_ad_ceiling: 0, end_date: "" })).toEqual([]);
  });

  it("refuses what the API refuses", () => {
    expect(paidBudgetProblems({ ...ok, per_ad_budget: 0 })).toHaveLength(1);
    expect(paidBudgetProblems({ ...ok, monthly_ad_ceiling: Number.NaN })).toHaveLength(1);
    expect(paidBudgetProblems({ ...ok, per_ad_budget: 12000 })[0]).toMatch(/above the monthly ad ceiling/);
    expect(paidBudgetProblems({ ...ok, per_ad_budget: 2000.5 })[0]).toMatch(/whole amounts/);
    expect(paidBudgetProblems({ ...ok, period_days: 0 })[0]).toMatch(/1 to 90 days/);
    expect(paidBudgetProblems({ ...ok, period_days: 91 })[0]).toMatch(/1 to 90 days/);
  });

  it("reads the end date the way the API does", () => {
    expect(isISODate("2026-11-30")).toBe(true);
    expect(isISODate("2026-02-30")).toBe(false);
    expect(isISODate("30/11/2026")).toBe(false);
    expect(paidBudgetProblems({ ...ok, paid: false, end_date: "2026-13-01" })).toHaveLength(1);
    expect(paidBudgetProblems({ ...ok, end_date: "2026-12-31" })).toEqual([]);
  });
});
