import { describe, expect, it } from "vitest";
import type { TikTokCreatorInfo } from "@/lib/api/publishing";
import { emptyTikTokDraft, tiktokDisclosureLabel, tiktokOptions, tiktokProblem } from "./tiktok-post";

const info: TikTokCreatorInfo = {
  nickname: "Duka",
  username: "duka",
  avatar_url: "",
  privacy_level_options: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
  comment_disabled: false,
  duet_disabled: true,
  stitch_disabled: false,
  max_video_post_duration_sec: 60,
};

describe("tiktokProblem", () => {
  it("has no default audience", () => {
    expect(tiktokProblem(emptyTikTokDraft, info, 20, true)).toMatch(/Choose who can see/);
  });
  it("waits for the creator info", () => {
    expect(tiktokProblem({ ...emptyTikTokDraft, privacy: "SELF_ONLY" }, undefined, 20, true)).toMatch(/load/);
  });
  it("refuses a video longer than the creator may post", () => {
    expect(tiktokProblem({ ...emptyTikTokDraft, privacy: "SELF_ONLY" }, info, 90, true)).toMatch(/60 seconds/);
  });
  it("refuses an audience the creator cannot use", () => {
    expect(tiktokProblem({ ...emptyTikTokDraft, privacy: "FOLLOWER_OF_CREATOR" }, info, 20, true)).toMatch(/cannot use/);
  });
  it("needs a disclosure type once disclosure is on", () => {
    expect(tiktokProblem({ ...emptyTikTokDraft, privacy: "PUBLIC_TO_EVERYONE", disclose: true }, info, 20, true)).toMatch(/promotes/);
  });
  it("never lets branded content be private", () => {
    const d = { ...emptyTikTokDraft, privacy: "SELF_ONLY" as const, disclose: true, brandContent: true };
    expect(tiktokProblem(d, info, 20, true)).toMatch(/cannot be private/);
  });
  it("needs the consent", () => {
    expect(tiktokProblem({ ...emptyTikTokDraft, privacy: "SELF_ONLY" }, info, 20, false)).toMatch(/Agree/);
  });
  it("passes a complete choice", () => {
    expect(tiktokProblem({ ...emptyTikTokDraft, privacy: "PUBLIC_TO_EVERYONE" }, info, 20, true)).toBeNull();
  });
});

describe("tiktokOptions", () => {
  it("never sends an interaction the creator turned off", () => {
    const o = tiktokOptions({ ...emptyTikTokDraft, privacy: "PUBLIC_TO_EVERYONE", allowComment: true, allowDuet: true }, info);
    expect(o).toEqual({
      privacy_level: "PUBLIC_TO_EVERYONE",
      allow_comment: true,
      allow_duet: false,
      allow_stitch: false,
      brand_organic: false,
      brand_content: false,
    });
  });
  it("drops brand flags when disclosure is off", () => {
    const o = tiktokOptions({ ...emptyTikTokDraft, privacy: "PUBLIC_TO_EVERYONE", brandOrganic: true }, info);
    expect(o.brand_organic).toBe(false);
  });
});

describe("tiktokDisclosureLabel", () => {
  it("names the label TikTok shows", () => {
    expect(tiktokDisclosureLabel({ ...emptyTikTokDraft, disclose: true, brandOrganic: true })).toMatch(/Promotional content/);
    expect(tiktokDisclosureLabel({ ...emptyTikTokDraft, disclose: true, brandContent: true })).toMatch(/Paid partnership/);
    expect(tiktokDisclosureLabel(emptyTikTokDraft)).toBeNull();
  });
});
