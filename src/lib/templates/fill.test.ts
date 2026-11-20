import { describe, expect, it } from "vitest";
import { fieldLabel, fillTemplate, templateFields, unfilledFields } from "./fill";

describe("template fields", () => {
  const t = "Write ads for ${offering} on ${platforms} this week, budget ${budget}. Lead with ${offering}.";

  it("lists each field once, in order", () => {
    expect(templateFields(t)).toEqual(["offering", "platforms", "budget"]);
    expect(templateFields("No fields here")).toEqual([]);
  });

  it("fills every slot and leaves an empty one visible", () => {
    const out = fillTemplate(t, { offering: "Python course", platforms: "Facebook and TikTok", budget: " " });
    expect(out).toBe("Write ads for Python course on Facebook and TikTok this week, budget ${budget}. Lead with Python course.");
    expect(unfilledFields(out)).toEqual(["budget"]);
    expect(unfilledFields(fillTemplate(t, { offering: "a", platforms: "b", budget: "KES 3,000" }))).toEqual([]);
  });

  it("labels a field for the form", () => {
    expect(fieldLabel("offering")).toBe("Offering");
    expect(fieldLabel("target_audience")).toBe("Target audience");
  });
});
