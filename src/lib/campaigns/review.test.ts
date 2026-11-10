import { describe, expect, it } from "vitest";
import { metaReviewLabel } from "./review";

const withState = (state: Record<string, unknown>) => ({ metadata: { launch: { state } } });

describe("metaReviewLabel", () => {
  it("reads the boost's launch state", () => {
    expect(metaReviewLabel(withState({ stage: "review", review_status: "PENDING_REVIEW" }))).toEqual({ text: "Meta is reviewing the ad", tone: "info" });
    expect(metaReviewLabel(withState({ stage: "funding" }))).toEqual({ text: "Approved, waiting for funds", tone: "warning" });
    expect(metaReviewLabel(withState({ stage: "live" }))).toEqual({ text: "Live on Meta", tone: "success" });
    expect(metaReviewLabel(withState({ stage: "failed", error: "Meta did not approve the ad: Misleading claims" }))).toEqual({
      text: "Meta did not approve the ad: Misleading claims",
      tone: "danger",
    });
  });
  it("is null for a campaign that is not a boost", () => {
    expect(metaReviewLabel({ metadata: {} })).toBeNull();
    expect(metaReviewLabel({})).toBeNull();
  });
});
