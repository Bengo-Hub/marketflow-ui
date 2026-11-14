import { describe, expect, it } from "vitest";
import { autopilotPlanRefusal, type AutopilotPlan } from "@/lib/api/autopilot";
import { canCreateAgents, canSwitchOn, planSummary, refusalText, showUpgrade, upgradeHref } from "./autopilot-plan";

const plan = (over: Partial<AutopilotPlan> = {}): AutopilotPlan => ({
  included: true,
  limit: 3,
  active: 1,
  can_activate: true,
  upgrade_path: "/settings/billing",
  ...over,
});

describe("planSummary", () => {
  it("shows the count against the limit", () => {
    expect(planSummary(plan())).toBe("Agents switched on: 1 of the 3 your plan allows.");
    expect(planSummary(plan({ limit: 1, active: 0 }))).toBe("Agents switched on: 0 of the 1 your plan allows.");
  });
  it("says unlimited for -1", () => {
    expect(planSummary(plan({ limit: -1, active: 4 }))).toContain("as many agents as you need");
  });
  it("names the starting plan when Autopilot is not included", () => {
    expect(planSummary(plan({ included: false, can_activate: false }))).toContain("MarketFlow Lite");
  });
  it("explains an unknown plan and the exempt platform tenant", () => {
    expect(planSummary(plan({ unknown: true, included: false }))).toContain("could not be checked");
    expect(planSummary(plan({ exempt: true, limit: -1 }))).toContain("No plan limit");
    expect(planSummary(undefined)).toBeNull();
  });
});

describe("gates", () => {
  it("offers an upgrade when the plan leaves Autopilot out or the limit is reached", () => {
    expect(showUpgrade(plan({ included: false, can_activate: false }))).toBe(true);
    expect(showUpgrade(plan({ active: 3, can_activate: false }))).toBe(true);
    expect(showUpgrade(plan())).toBe(false);
    expect(showUpgrade(plan({ unknown: true, included: false, can_activate: false }))).toBe(false);
    expect(showUpgrade(plan({ exempt: true }))).toBe(false);
  });
  it("blocks creating agents only on a definite no", () => {
    expect(canCreateAgents(plan({ included: false }))).toBe(false);
    expect(canCreateAgents(plan({ included: false, unknown: true }))).toBe(true);
    expect(canCreateAgents(undefined)).toBe(true);
  });
  it("blocks switching on at the limit", () => {
    expect(canSwitchOn(plan({ can_activate: false }))).toBe(false);
    expect(canSwitchOn(plan())).toBe(true);
    expect(canSwitchOn(undefined)).toBe(true);
  });
});

describe("refusals", () => {
  const apiError = (code: string, details: Record<string, unknown> = {}) => ({ response: { data: { code, error: "msg", details } } });

  it("reads the limit refusal and its upgrade path", () => {
    const r = autopilotPlanRefusal(apiError("autopilot_limit_reached", { limit: 3, active: 3, upgrade_path: "/settings/billing" }));
    expect(r).toMatchObject({ code: "autopilot_limit_reached", limit: 3, active: 3, upgradePath: "/settings/billing" });
    expect(refusalText(r!)).toBe("Your plan allows 3 agents on at once. Switch one off, or upgrade for more.");
  });
  it("reads the not-in-plan refusal", () => {
    const r = autopilotPlanRefusal(apiError("autopilot_not_in_plan"));
    expect(r?.upgradePath).toBe("/settings/billing");
    expect(refusalText(r!)).toContain("MarketFlow Lite");
  });
  it("ignores other errors", () => {
    expect(autopilotPlanRefusal(apiError("invalid_autopilot"))).toBeNull();
    expect(autopilotPlanRefusal(new Error("network"))).toBeNull();
    expect(autopilotPlanRefusal(undefined)).toBeNull();
  });
  it("builds the upgrade link inside the organisation", () => {
    expect(upgradeHref("acme", "/settings/billing")).toBe("/acme/settings/billing");
    expect(upgradeHref("acme", "https://evil.example")).toBe("/acme/settings/billing");
  });
});
