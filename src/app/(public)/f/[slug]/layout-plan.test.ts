import { describe, expect, it } from "vitest";
import { primaryStepIndex, splitBenefits, starCount } from "./layout-plan";

describe("funnel page plan", () => {
  it("puts the first form forward as the main action", () => {
    expect(primaryStepIndex([{ title: "Why" }, { fields: [{ key: "phone", label: "Phone" }] }, { block_type: "form" }])).toBe(1);
  });
  it("falls back to the first action block, else none", () => {
    expect(primaryStepIndex([{ title: "Why" }, { block_type: "whatsapp" }])).toBe(1);
    expect(primaryStepIndex([{ title: "Why" }])).toBe(-1);
    expect(primaryStepIndex([])).toBe(-1);
  });
  it("turns bulleted description lines into benefits", () => {
    expect(splitBenefits("Grow your sales.\n- Free delivery\n* Pay by M-Pesa\n1. Ready in a day")).toEqual({
      intro: "Grow your sales.",
      benefits: ["Free delivery", "Pay by M-Pesa", "Ready in a day"],
    });
    expect(splitBenefits(undefined)).toEqual({ intro: "", benefits: [] });
  });
  it("shows no stars for an unrated quote", () => {
    expect(starCount(0)).toBe(0);
    expect(starCount(4.6)).toBe(5);
    expect(starCount(9)).toBe(5);
  });
});
