import { describe, expect, it } from "vitest";
import { RULE_TRIGGERS, ruleTriggers } from "./autopilot-triggers";

describe("autopilot rule triggers", () => {
  it("offers the new item and testimonial switches", () => {
    expect(RULE_TRIGGERS.map((t) => t.key)).toEqual(["new_item_drafts", "testimonial_drafts"]);
    for (const t of RULE_TRIGGERS) {
      expect(t.label.length).toBeGreaterThan(0);
      expect(t.help).toMatch(/credits/);
    }
  });

  it("reads the saved switches and defaults them off", () => {
    expect(ruleTriggers(undefined)).toEqual({ new_item_drafts: false, testimonial_drafts: false });
    expect(ruleTriggers({ new_item_drafts: true })).toEqual({ new_item_drafts: true, testimonial_drafts: false });
    expect(ruleTriggers({ testimonial_drafts: true })).toEqual({ new_item_drafts: false, testimonial_drafts: true });
  });
});
