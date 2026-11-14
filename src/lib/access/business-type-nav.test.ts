import { describe, expect, it } from "vitest";
import { filterByBusinessType, isBusinessType } from "./business-type-nav";

describe("business type navigation", () => {
  const groups = [
    {
      label: "Settings",
      items: [
        { href: "/settings", label: "All settings" },
        { href: "/settings/ppb-approvals", label: "PPB approvals", businessType: "pharmacy" },
      ],
    },
    { label: "Pharmacy only", items: [{ href: "/x", label: "X", businessType: "pharmacy" }] },
  ];

  it("shows pharmacy items only to a pharmacy", () => {
    const pharmacy = filterByBusinessType(groups, "pharmacy");
    expect(pharmacy[0].items.map((i) => i.href)).toEqual(["/settings", "/settings/ppb-approvals"]);
    expect(pharmacy).toHaveLength(2);
    expect(filterByBusinessType(groups, " Pharmacy ")[0].items).toHaveLength(2);
  });

  it("hides them from other types and while the profile loads, and drops empty groups", () => {
    for (const bt of ["generic", "flp", "retail", "", undefined, null]) {
      const out = filterByBusinessType(groups, bt);
      expect(out.map((g) => g.label)).toEqual(["Settings"]);
      expect(out[0].items.map((i) => i.href)).toEqual(["/settings"]);
    }
  });

  it("compares types without case or spaces", () => {
    expect(isBusinessType("PHARMACY ", "pharmacy")).toBe(true);
    expect(isBusinessType("chemist", "pharmacy")).toBe(false);
    expect(isBusinessType(undefined, "pharmacy")).toBe(false);
  });
});
