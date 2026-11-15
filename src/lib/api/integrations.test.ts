import { describe, expect, it } from "vitest";
import { accountsNeedingReconnect, needsReconnect, reconnectLabel } from "./integrations";

describe("connected account health", () => {
  it("lists only the accounts of connected providers that need reconnecting", () => {
    const out = accountsNeedingReconnect([
      {
        provider: "meta_ads",
        name: "default",
        connected: true,
        fields: {},
        accounts: [
          { type: "facebook_page", external_id: "1", name: "Shop", health: "ok" },
          { type: "instagram_business", external_id: "ig", name: "shop", health: "expiring", expires_at: "2026-11-20T10:00:00Z" },
          { type: "meta_ad_account", external_id: "act_1", name: "Ads" },
        ],
      },
      {
        provider: "tiktok_ads",
        name: "default",
        connected: false,
        fields: {},
        accounts: [{ type: "tiktok_advertiser", external_id: "7", name: "TT", health: "expired" }],
      },
    ]);
    expect(out.map((a) => a.external_id)).toEqual(["ig"]);
    expect(out[0].provider).toBe("meta_ads");
    expect(accountsNeedingReconnect(undefined)).toEqual([]);
  });

  it("reads health from older API answers that send none", () => {
    expect(needsReconnect({ type: "facebook_page", external_id: "1", name: "Shop" })).toBe(false);
  });

  it("labels the renew-by date", () => {
    expect(reconnectLabel({ type: "x", external_id: "1", name: "a", health: "expiring", expires_at: "2026-11-20T10:00:00Z" })).toBe(
      "Reconnect by 20 Nov 2026",
    );
    expect(reconnectLabel({ type: "x", external_id: "1", name: "a", health: "expired" })).toMatch(/Stopped working/);
  });
});
