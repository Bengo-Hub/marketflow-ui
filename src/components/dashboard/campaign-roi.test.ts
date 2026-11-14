import { describe, expect, it } from "vitest";
import { averageNote, returnLabel } from "./campaign-roi";

describe("campaign return labels", () => {
  it("signs the return and leaves it empty without spend", () => {
    expect(returnLabel(150.4)).toBe("+150%");
    expect(returnLabel(-20)).toBe("-20%");
    expect(returnLabel(undefined)).toBe("");
  });

  it("says where the average sale value came from", () => {
    expect(averageNote({ average_from: "none", average_sale_value: 0, currency: "KES" })).toContain("Only won deals count");
    expect(averageNote({ average_from: "won_deals", average_sale_value: 2500, currency: "KES" })).toContain("last 180 days");
    expect(averageNote({ average_from: "setting", average_sale_value: 2500, currency: "KES" })).toContain("your average sale value");
  });
});
