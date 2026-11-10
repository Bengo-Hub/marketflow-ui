import { describe, expect, it } from "vitest";
import { leadAdSource } from "./ad-source";

describe("leadAdSource", () => {
  it("names a Meta instant-form lead and its creative", () => {
    expect(leadAdSource({ metadata: { meta_ad_id: "1", creative_version_id: "v1" } })).toBe("Meta ad · creative");
  });
  it("names click ids from public forms", () => {
    expect(leadAdSource({ metadata: { ttclid: "t" } })).toBe("TikTok ad click");
    expect(leadAdSource({ metadata: { gclid: "g" } })).toBe("Google ad click");
    expect(leadAdSource({ metadata: { fbclid: "f" } })).toBe("Facebook ad click");
  });
  it("is empty without ad data", () => {
    expect(leadAdSource({ metadata: { funnel_slug: "x" } })).toBe("");
    expect(leadAdSource({})).toBe("");
  });
});
