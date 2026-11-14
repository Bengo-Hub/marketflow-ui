import { describe, expect, it } from "vitest";
import type { AutopilotPost, AutoPublishStatus } from "@/lib/api/autopilot";
import { canOfferVetoWindow, canSaveVetoWindow, clampVetoHours, countdown, isCancellable, openPosts, postStateLabel } from "./veto-window";

const status = (over: Partial<AutoPublishStatus> = {}): AutoPublishStatus => ({
  plan_allows: true,
  terms_accepted: false,
  terms_version: "2026-11-14",
  can_auto_publish: false,
  hold_categories: [],
  terms: [],
  default_veto_hours: 4,
  min_veto_hours: 1,
  max_veto_hours: 72,
  ...over,
});

const post = (over: Partial<AutopilotPost>): AutopilotPost => ({
  version_id: "v",
  brief_id: "b",
  agent_id: "a",
  offering: "Shea butter",
  state: "scheduled",
  status: "ready",
  ...over,
});

const now = new Date("2026-11-14T10:00:00Z");

// Owner 2026-11-14: the veto window needs the plan feature and the Autopilot terms.
describe("veto window eligibility", () => {
  it("is offered only on a plan that includes it", () => {
    expect(canOfferVetoWindow(undefined)).toBe(false);
    expect(canOfferVetoWindow(status({ plan_allows: false }))).toBe(false);
    expect(canOfferVetoWindow(status())).toBe(true);
  });
  it("saves once the terms are accepted, or are being accepted now", () => {
    expect(canSaveVetoWindow(status(), false)).toBe(false);
    expect(canSaveVetoWindow(status(), true)).toBe(true);
    expect(canSaveVetoWindow(status({ terms_accepted: true }), false)).toBe(true);
    expect(canSaveVetoWindow(status({ plan_allows: false, terms_accepted: true }), true)).toBe(false);
  });
});

describe("clampVetoHours", () => {
  it("keeps the hours inside the allowed range", () => {
    expect(clampVetoHours(0, status())).toBe(1);
    expect(clampVetoHours(100, status())).toBe(72);
    expect(clampVetoHours(5.6, status())).toBe(6);
    expect(clampVetoHours(Number.NaN, status())).toBe(4);
    expect(clampVetoHours(Number.NaN)).toBe(4);
  });
});

describe("countdown", () => {
  it("writes the time left in words", () => {
    expect(countdown("2026-11-14T13:12:30Z", now)).toBe("3 h 12 min");
    expect(countdown("2026-11-14T14:00:00Z", now)).toBe("4 h");
    expect(countdown("2026-11-14T10:45:00Z", now)).toBe("45 min");
    expect(countdown("2026-11-14T10:00:30Z", now)).toBe("under a minute");
    expect(countdown("2026-11-14T09:59:00Z", now)).toBe("due now");
    expect(countdown(undefined, now)).toBe("");
    expect(countdown("not a date", now)).toBe("");
  });
});

describe("isCancellable", () => {
  it("allows a cancel while the video is made or its window is open", () => {
    expect(isCancellable(post({ state: "active" }), now)).toBe(true);
    expect(isCancellable(post({ publish_at: "2026-11-14T11:00:00Z" }), now)).toBe(true);
    expect(isCancellable(post({ publish_at: "2026-11-14T09:00:00Z" }), now)).toBe(false);
    expect(isCancellable(post({ state: "released" }), now)).toBe(false);
    expect(isCancellable(post({ state: "vetoed" }), now)).toBe(false);
  });
});

describe("openPosts", () => {
  it("lists scheduled posts first, soonest first, then those being made and those waiting", () => {
    const got = openPosts([
      post({ version_id: "held", state: "held" }),
      post({ version_id: "later", publish_at: "2026-11-14T15:00:00Z" }),
      post({ version_id: "done", state: "released" }),
      post({ version_id: "making", state: "active" }),
      post({ version_id: "soon", publish_at: "2026-11-14T11:00:00Z" }),
    ]);
    expect(got.map((p) => p.version_id)).toEqual(["soon", "later", "making", "held"]);
  });
  it("labels states in plain words", () => {
    expect(postStateLabel("held")).toBe("Waiting for your approval");
    expect(postStateLabel("unknown")).toBe("unknown");
  });
});
