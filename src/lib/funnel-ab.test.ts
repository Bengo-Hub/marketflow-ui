import { describe, expect, it } from "vitest";
import { applyVariant, newBucket, parseBucket, variantFor } from "./funnel-ab";

describe("funnel A/B", () => {
  it("reads only a two-digit bucket", () => {
    expect(parseBucket("7")).toBe(7);
    expect(parseBucket("99")).toBe(99);
    expect(parseBucket("100")).toBeNull();
    expect(parseBucket("x")).toBeNull();
    expect(parseBucket(undefined)).toBeNull();
    const b = newBucket();
    expect(b >= 0 && b < 100).toBe(true);
  });

  it("buckets below the split see B", () => {
    const ab = { split: 30, b: { headline: "B" } };
    expect(variantFor(ab, 29)).toBe("b");
    expect(variantFor(ab, 30)).toBe("a");
    expect(variantFor(undefined, 0)).toBe("a");
    expect(variantFor(ab, null)).toBe("a");
  });

  it("version B replaces only the fields it sets", () => {
    const f = { headline: "A", subheadline: "Sub A", ab_test: { split: 50, b: { headline: "B" } } };
    expect(applyVariant(f, "b")).toMatchObject({ headline: "B", subheadline: "Sub A" });
    expect(applyVariant(f, "a").headline).toBe("A");
  });
});
