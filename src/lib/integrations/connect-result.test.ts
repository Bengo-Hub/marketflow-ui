import { describe, expect, it } from "vitest";
import { connectErrorText } from "./connect-result";

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
  it("returns null when there is no error", () => {
    expect(connectErrorText("meta", null)).toBeNull();
  });
});
