import { describe, expect, it } from "vitest";
import { fieldLabel, fillTemplate, isMoneyField, templateFields, unfilledFields } from "./fill";
import { formatMoneyText } from "@/lib/money";

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

describe("money fields", () => {
  it("knows which slots are amounts", () => {
    expect(isMoneyField("budget")).toBe(true);
    expect(isMoneyField("price")).toBe(true);
    expect(isMoneyField("offering")).toBe(false);
  });

  it("a budget reaches the team with its currency", () => {
    const text = fillTemplate("Write ads for ${offering}, budget ${budget}.", {
      offering: "Shea butter",
      budget: formatMoneyText(3000, "KES"),
    });
    expect(text).toBe("Write ads for Shea butter, budget KES 3,000.");
    expect(fillTemplate("budget ${budget}", { budget: formatMoneyText(12.5, "USD") })).toBe("budget USD 12.50");
  });
});
