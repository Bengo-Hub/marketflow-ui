import { describe, expect, it } from "vitest";
import { connectErrorHelp, connectErrorText } from "./connect-result";

describe("connectErrorText", () => {
  it("explains the reasons a Meta connect returns with", () => {
    expect(connectErrorText("meta", "no_pages")).toMatch(/tick at least one Facebook Page/);
    expect(connectErrorText("meta", "cancelled")).toMatch(/cancelled/);
    expect(connectErrorText("meta", "state_expired")).toMatch(/expired/);
  });
  it("falls back to a generic message that names the provider", () => {
    expect(connectErrorText("tiktok", "token_exchange_failed")).toMatch(/TikTok/);
    expect(connectErrorText("google", "weird")).toMatch(/Google Calendar/);
  });
  it("explains the reasons a YouTube connect returns with", () => {
    expect(connectErrorText("youtube", "missing_scope")).toMatch(/leave both ticked/);
    expect(connectErrorText("youtube", "no_channel")).toMatch(/no YouTube channel/);
    expect(connectErrorText("youtube", "token_exchange_failed")).toMatch(/YouTube could not be connected/);
  });
  it("returns null when there is no error", () => {
    expect(connectErrorText("meta", null)).toBeNull();
  });
  it("links laypeople to create the missing account", () => {
    expect(connectErrorHelp("google_ads", "no_account")?.href).toBe("https://ads.google.com/home/");
    expect(connectErrorHelp("tiktok", "no_account")?.href).toBe("https://ads.tiktok.com/");
    expect(connectErrorText("tiktok", "no_account")).toContain("no TikTok ads account");
    expect(connectErrorHelp("meta", "no_pages")).toBeNull();
    expect(connectErrorHelp("google_ads", null)).toBeNull();
  });
});
