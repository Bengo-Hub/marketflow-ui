import { describe, expect, it } from "vitest";
import { tenantIntegrations } from "./catalog";

// A Connect button must lead somewhere: Google Ads and LinkedIn have no authorize route in
// marketflow-api yet (Sprint 19), so they are shown as coming soon instead of a 404.
describe("tenant integrations", () => {
  it("marks integrations without an API route as coming soon", () => {
    const soon = tenantIntegrations.filter((i) => i.comingSoon).map((i) => i.id).sort();
    expect(soon).toEqual(["google_ads", "linkedin_ads"]);
  });
  it("keeps the working connect flows", () => {
    const live = tenantIntegrations.filter((i) => !i.comingSoon).map((i) => i.id).sort();
    expect(live).toEqual(["google_calendar", "meta_ads", "tiktok_ads"]);
  });
});
