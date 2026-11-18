import { describe, expect, it } from "vitest";
import { isRelevant, quotaLine, tagLabels, tagsForBrief } from "./research-tags";

describe("research tags", () => {
  it("labels hook, angle and offer and skips other", () => {
    expect(tagLabels({ hook_type: "question", angle: "pain", offer_type: "free_delivery", relevance: "related" })).toEqual([
      "Opens with a question",
      "Pain relief",
      "Free delivery",
    ]);
    expect(tagLabels({ hook_type: "other", angle: "brand_new" })).toEqual(["brand new"]);
    expect(tagLabels(undefined)).toEqual([]);
  });

  it("reads relevance", () => {
    expect(isRelevant({ relevance: "very relevant" })).toBe(true);
    expect(isRelevant({ relevance: "loosely related" })).toBe(false);
    expect(isRelevant(undefined)).toBe(false);
  });

  it("describes tags for a draft without any ad words", () => {
    expect(tagsForBrief({ hook_type: "social_proof", angle: "price_value", offer_type: "no_offer" })).toBe(
      "opens with social proof, uses the price value angle",
    );
    expect(tagsForBrief({})).toBe("");
  });

  it("says what is left this month", () => {
    const use = { platform_used: 10, platform_limit: 250, tenant_used: 2, tenant_limit: 5, tenant_left: 3 };
    expect(quotaLine({ month: "2026-11", scan: use, details: use })).toBe("3 of 5 competitor searches left in November.");
    expect(quotaLine({ month: "2026-11", scan: { ...use, tenant_left: 0 }, details: use })).toMatch(/used\. They resume on the 1st/);
    expect(quotaLine(null)).toBeNull();
  });
});
