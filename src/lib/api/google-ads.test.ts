import { describe, expect, it } from "vitest";
import { conversionProblem, type GoogleAdsAccount } from "./google-ads";

const account = (more: Partial<GoogleAdsAccount>): GoogleAdsAccount => ({
  connected_account_id: "a", customer_id: "1", name: "Shop", status: "active", conversion_actions: {}, ...more,
});
const at = "2026-11-25T09:00:00Z";

describe("conversionProblem", () => {
  it("asks for a reconnect when the permission is missing", () => {
    expect(conversionProblem(account({ conversions_blocked: true }))).toMatchObject({ reconnect: true });
    expect(conversionProblem(account({ last_upload: { status: "reconnect", reason: "Reconnect Google Ads.", at } }))).toEqual({ text: "Reconnect Google Ads.", reconnect: true });
  });
  it("gives Google's reason for a refused conversion", () => {
    expect(conversionProblem(account({ last_upload: { status: "failed", reason: "Too old.", at } }))).toEqual({ text: "Google did not count the last conversion. Too old.", reconnect: false });
  });
  it("is quiet otherwise", () => {
    expect(conversionProblem(account({}))).toBeNull();
    expect(conversionProblem(account({ last_upload: { status: "accepted", at } }))).toBeNull();
  });
});
