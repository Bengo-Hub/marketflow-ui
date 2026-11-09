import { describe, expect, it } from "vitest";
import { runsOnAdPlatform, type Campaign } from "./campaigns";

const base: Campaign = { id: "c1", name: "Boost", platform: "meta", status: "active", created_at: "2026-11-10T00:00:00Z" };

describe("runsOnAdPlatform", () => {
  it("is true for a boost on a connected ad account", () => {
    expect(runsOnAdPlatform({ ...base, connected_account_id: "acc-1" })).toBe(true);
  });
  it("is true for a campaign carrying a Meta id", () => {
    expect(runsOnAdPlatform({ ...base, meta_campaign_id: "120210000000001" })).toBe(true);
  });
  it("is false for a plain campaign", () => {
    expect(runsOnAdPlatform({ ...base, meta_campaign_id: "", connected_account_id: null })).toBe(false);
    expect(runsOnAdPlatform(undefined)).toBe(false);
  });
});
