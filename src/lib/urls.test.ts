import { describe, expect, it } from "vitest";
import { adLeadUrl, funnelUrl } from "./urls";

describe("ad lead links", () => {
  it("links to the funnel with per-ad UTM tags", () => {
    const url = new URL(adLeadUrl("ad-1a2b3c", "1a2b3c4d-0000-0000-0000-000000000000", "facebook", "paid"));
    expect(url.pathname).toBe("/f/ad-1a2b3c");
    expect(url.searchParams.get("utm_source")).toBe("facebook");
    expect(url.searchParams.get("utm_medium")).toBe("paid");
    expect(url.searchParams.get("utm_campaign")).toBe("ad-1a2b3c4d");
  });

  it("encodes the slug", () => {
    expect(funnelUrl("a b/c")).toMatch(/\/f\/a%20b%2Fc$/);
  });
});
