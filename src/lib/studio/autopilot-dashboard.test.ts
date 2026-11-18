import { describe, expect, it } from "vitest";
import type { AutopilotWeek } from "@/lib/api/autopilot";
import { costPerLead, draftHref, draftStep, runStatus, runTrigger, skipReason, weekIsEmpty } from "./autopilot-dashboard";

const week = (over: Partial<AutopilotWeek> = {}): AutopilotWeek => ({
  since: "2026-11-11T00:00:00Z",
  ads_made: 0,
  credits: 0,
  spend: 0,
  leads: 0,
  cpl: 0,
  ...over,
});

describe("autopilot dashboard", () => {
  it("labels each run status, with a fallback for an unknown one", () => {
    expect(runStatus({ status: "completed" })).toEqual({ label: "Drafted", tone: "success" });
    expect(runStatus({ status: "skipped" }).tone).toBe("warning");
    expect(runStatus({ status: "failed" }).tone).toBe("danger");
    expect(runStatus({ status: "pending" }).label).toBe("Running");
    expect(runStatus({ status: "brand_new_state" })).toEqual({ label: "brand_new_state", tone: "neutral" });
  });

  it("explains a skipped run from its trace, and nothing for other runs", () => {
    expect(skipReason({ status: "skipped", trace: { skip: "credits" } })).toBe("AI credits were low.");
    expect(skipReason({ status: "skipped", trace: { skip: "ad_funds" } })).toContain("ad account");
    expect(skipReason({ status: "skipped", trace: { skip: "ad_ceiling" } })).toContain("ceiling");
    expect(skipReason({ status: "skipped", trace: { skip: "ended" } })).toContain("last day");
    expect(skipReason({ status: "skipped", error_message: "the agent has ended" })).toBe("the agent has ended");
    expect(skipReason({ status: "completed", trace: { skip: "credits" } })).toBe("");
  });

  it("names how a run started", () => {
    expect(runTrigger({ triggered_by: "schedule" })).toBe("On schedule");
    expect(runTrigger({ triggered_by: "manual" })).toBe("Draft one now");
    expect(runTrigger({ triggered_by: "rule:new_item" })).toBe("Rule");
    expect(runTrigger({})).toBe("");
  });

  it("says what a pending draft waits for and links it to the Studio", () => {
    expect(draftStep({ status: "script_ready" })).toBe("Script to review");
    expect(draftStep({ status: "ready" })).toBe("Ready to approve and post");
    expect(draftHref("acme", { brief_id: "b-1" })).toBe("/acme/studio/b-1");
  });

  it("treats a week with no ads, credits, spend or leads as empty", () => {
    expect(weekIsEmpty(undefined)).toBe(true);
    expect(weekIsEmpty(week())).toBe(true);
    expect(weekIsEmpty(week({ ads_made: 1 }))).toBe(false);
    expect(weekIsEmpty(week({ spend: 250 }))).toBe(false);
  });

  it("shows cost per lead only once there are leads", () => {
    const fmt = (n: number) => `KES ${n}`;
    expect(costPerLead(week({ leads: 0, cpl: 0 }), fmt)).toBe("No leads yet");
    expect(costPerLead(week({ leads: 5, cpl: 200 }), fmt)).toBe("KES 200");
  });
});
