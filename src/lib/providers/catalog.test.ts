import { describe, expect, it } from "vitest";
import { tenantIntegrations } from "./catalog";

// A Connect button must lead somewhere: LinkedIn has no authorize route in marketflow-api yet, so
// it is shown as coming soon instead of a 404. Google Ads connects since 2026-11-19.
describe("tenant integrations", () => {
  it("marks integrations without an API route as coming soon", () => {
    const soon = tenantIntegrations.filter((i) => i.comingSoon).map((i) => i.id).sort();
    expect(soon).toEqual(["linkedin_ads"]);
  });
  it("keeps the working connect flows", () => {
    const live = tenantIntegrations.filter((i) => !i.comingSoon).map((i) => i.id).sort();
    expect(live).toEqual(["google_ads", "google_calendar", "meta_ads", "tiktok", "tiktok_ads", "youtube"]);
  });
  it("connects TikTok posting through its own route, apart from TikTok for Business", () => {
    const posting = tenantIntegrations.find((i) => i.id === "tiktok");
    expect(posting?.authorizePath).toBe("/api/v1/integrations/tiktok-creator/authorize");
    expect(posting?.requiresPlatformConfig).toBe("tiktok");
  });
});
