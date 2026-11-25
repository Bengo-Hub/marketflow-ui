import { describe, expect, it } from "vitest";
import type { RunAdsView } from "@/lib/api/ads";
import { amountsCurrency, buildChoice, estimateLine, estimateText, modeLabel, runAdsPatch, runAdsSettingsProblems, sourceLabel, withLocal, type RunAdsSettingsForm } from "./run-ads";

const platform: RunAdsView = {
  platforms: ["meta", "google", "tiktok"],
  tier: "recommended",
  daily_budget: {},
  days: 7,
  total_cap: 0,
  total_cap_kes: 0,
  rule_of_thumb_kes: { meta: { low: 650, recommended: 1300, high: 2600 } },
  tiktok_mode: "guided",
  currency: "USD",
};

const same: RunAdsSettingsForm = { platforms: ["meta", "google", "tiktok"], tier: "recommended", daily_budget: {}, days: 7, total_cap: null, currency: "USD", amounts_currency: "USD" };

describe("buildChoice", () => {
  it("sends nothing when nothing changed", () => {
    expect(buildChoice({ platforms: {} })).toEqual({});
  });

  it("sends a typed amount instead of the tier, and a tier only without one", () => {
    expect(
      buildChoice({
        days: 10,
        totalCap: 0,
        platforms: { meta: { tier: "high", daily: 1500.4 }, google: { tier: "low" }, tiktok: { enabled: false } },
      }),
    ).toEqual({
      days: 10,
      total_cap: 0,
      platforms: [
        { platform: "meta", daily: 1500 },
        { platform: "google", tier: "low" },
        { platform: "tiktok", enabled: false },
      ],
    });
  });

  it("leaves out bad days, the custom tier and platforms with nothing set", () => {
    expect(buildChoice({ days: 0, platforms: { meta: { tier: "custom" }, google: {} } })).toEqual({});
    expect(buildChoice({ days: 91, platforms: {} })).toEqual({});
  });
});

describe("estimates", () => {
  it("reads as a sentence with its source", () => {
    const e = { metric: "reach", value: 1234.4, per: "day", source: "platform", label: "" };
    expect(estimateText(e)).toBe("About 1,234 people reached per day");
    expect(estimateLine(e, "meta")).toBe("About 1,234 people reached per day (Meta delivery estimate)");
    expect(estimateLine({ ...e, metric: "clicks", per: "week" }, "google")).toBe("About 1,234 clicks per week (Google Ads budget recommendation)");
    expect(estimateLine({ ...e, metric: "leads", per: "run", source: "your_results", label: "From your own past results on this platform" })).toBe(
      "About 1,234 leads over the whole run (From your own past results on this platform)",
    );
  });

  it("labels the rule of thumb as not an estimate", () => {
    expect(sourceLabel("rule_of_thumb", "")).toBe("MarketFlow rule of thumb (platform settings), not an estimate");
    expect(sourceLabel("your_results", undefined)).toBe("From your own past results");
  });

  it("names each mode", () => {
    expect(modeLabel("automatic", "meta")).toBe("Automatic");
    expect(modeLabel("api", "google")).toBe("Created for you through the Google Ads API");
    expect(modeLabel("guided", "tiktok")).toBe("Guided: you set it up with these links");
  });
});

describe("runAdsPatch", () => {
  it("is null when everything matches the platform", () => {
    expect(runAdsPatch(same, platform)).toBeNull();
  });

  it("sends only what differs, amounts with the currency they are in", () => {
    const patch = runAdsPatch(
      { ...same, platforms: ["google", "meta"], tier: "high", daily_budget: { meta: 1200, google: null, tiktok: 0 }, days: 14, total_cap: 20000, amounts_currency: "KES" },
      platform,
    );
    expect(patch).toEqual({ platforms: ["meta", "google"], tier: "high", daily_budget: { meta: 1200 }, days: 14, total_cap: 20000, amounts_currency: "KES" });
  });

  it("sends a cap of 0 as no cap, and the ads currency only when it differs", () => {
    expect(runAdsPatch({ ...same, total_cap: 0 }, platform)).toEqual({ total_cap: 0 });
    expect(runAdsPatch({ ...same, currency: "KES" }, platform)).toEqual({ currency: "KES" });
  });

  it("keeps saved amounts in the currency they were saved in", () => {
    const saved = { ...platform, daily_budget: { meta: 1300 } };
    expect(amountsCurrency(saved, "KES")).toBe("KES");
    expect(amountsCurrency({ ...saved, amounts_currency: "USD" }, "KES")).toBe("USD");
    expect(amountsCurrency(platform, "KES")).toBe("USD");
  });

  it("shows the business's own currency beside", () => {
    expect(withLocal(190, "USD", 24700, "KES")).toContain("(about ");
    expect(withLocal(190, "KES", undefined, undefined)).not.toContain("about");
  });

  it("sends the currency of typed amounts", () => {
    expect(buildChoice({ currency: "USD", platforms: { meta: { daily: 10 } } })).toEqual({ currency: "USD", platforms: [{ platform: "meta", daily: 10 }] });
    expect(buildChoice({ currency: "USD", platforms: { meta: { tier: "low" } } })).toEqual({ platforms: [{ platform: "meta", tier: "low" }] });
  });

  it("checks the form", () => {
    expect(runAdsSettingsProblems(same)).toEqual([]);
    expect(runAdsSettingsProblems({ ...same, platforms: [], days: 0 })).toHaveLength(2);
  });
});
