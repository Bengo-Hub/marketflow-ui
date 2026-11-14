import { describe, expect, it } from "vitest";
import { aiLabelOn, aiLabelPatch } from "./ai-label";

// Owner 2026-11-14: the AI label is the owner's choice and stays on until turned off.
describe("ai label", () => {
  it("is on unless the owner turned it off", () => {
    expect(aiLabelOn(undefined)).toBe(true);
    expect(aiLabelOn({})).toBe(true);
    expect(aiLabelOn({ ai_label: "on" })).toBe(true);
    expect(aiLabelOn({ ai_label: "off" })).toBe(false);
    expect(aiLabelOn({ ai_label: false })).toBe(true);
  });
  it("saves as on or off", () => {
    expect(aiLabelPatch(true)).toEqual({ ai_label: "on" });
    expect(aiLabelPatch(false)).toEqual({ ai_label: "off" });
  });
});
