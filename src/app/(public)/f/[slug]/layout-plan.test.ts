import { describe, expect, it } from "vitest";
import { DEFAULT_LEAD_FIELDS, formFields, needsDefaultForm, primaryStepIndex,splitBenefits, starCount } from "./layout-plan";

describe("funnel page plan", () => {
  it("puts the first form forward as the main action", () => {
    expect(primaryStepIndex([{ title: "Why" }, { fields: [{ key: "phone", label: "Phone" }] }, { block_type: "form" }])).toBe(1);
  });
  it("falls back to the first action block, else none", () => {
    expect(primaryStepIndex([{ title: "Why" }, { block_type: "whatsapp" }])).toBe(1);
    expect(primaryStepIndex([{ title: "Why" }])).toBe(-1);
    expect(primaryStepIndex([])).toBe(-1);
  });
  it("shows the default lead form when the steps hold only content", () => {
    expect(needsDefaultForm([{ title: "Why" }, { block_type: "content", title: "How" }])).toBe(true);
    expect(needsDefaultForm([])).toBe(true);
    expect(needsDefaultForm([{ title: "Why" }, { block_type: "whatsapp" }])).toBe(false);
  });
  it("shows the form of a funnel made for an ad (marketflow-api CreateForAd)", () => {
    const step = {
      block_type: "form" as const,
      title: "Leave your details",
      cta_text: "Send",
      fields: [
        { key: "first_name", label: "Name", type: "text", required: true },
        { key: "phone", label: "Phone or WhatsApp", type: "tel", required: true },
        { key: "email", label: "Email", type: "email" },
      ],
    };
    expect(primaryStepIndex([step])).toBe(0);
    expect(needsDefaultForm([step])).toBe(false);
    expect(formFields(step)).toBe(step.fields);
    expect(formFields({ block_type: "form", fields: [] })).toBe(DEFAULT_LEAD_FIELDS);
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
