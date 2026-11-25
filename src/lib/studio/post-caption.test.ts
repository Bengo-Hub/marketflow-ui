import { describe, expect, it } from "vitest";
import { presetAccounts } from "@/lib/api/publishing";
import { adWords } from "./post-caption";

// 2026-11-25: a video ad's caption was only its link, which became the YouTube title.
describe("adWords", () => {
  it("reads a video ad's end card and a poster's copy", () => {
    expect(adWords({ end_card: { headline: "Digitika", subline: " Ages 6 to 16 ", cta: "Message us" }, script: {} })).toBe("Digitika\nAges 6 to 16\nMessage us");
    expect(adWords({ headline: "Poster", cta: "Call" })).toBe("Poster\nCall");
    expect(adWords(undefined)).toBe("");
  });
});

describe("presetAccounts", () => {
  it("starts with the plan's accounts, never TikTok's, whose audience a person chooses", () => {
    const post = (id: string, platform: "facebook" | "tiktok") => ({ connected_account_id: id, platform, display_name: id });
    const plan = { caption: "", ai_generated: true, best_time: true, timezone: "Africa/Nairobi", posts: [post("a", "facebook"), post("b", "tiktok")], skipped: [] };
    expect(presetAccounts(plan)).toEqual(["a"]);
    expect(presetAccounts(undefined)).toEqual([]);
  });
});
