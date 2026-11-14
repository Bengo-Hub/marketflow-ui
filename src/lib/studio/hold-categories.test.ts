import { describe, expect, it } from "vitest";
import {
  MAX_HOLD_ENTRIES,
  RESTRICTED_HOLD_CATEGORIES,
  addHoldWord,
  buildHold,
  holdChanged,
  normalizeHoldWord,
  splitHold,
} from "./hold-categories";

// Owner 2026-11-14: the keys are marketflow-api's restricted categories.
describe("RESTRICTED_HOLD_CATEGORIES", () => {
  it("uses the API's eight keys", () => {
    expect(RESTRICTED_HOLD_CATEGORIES.map((c) => c.key).sort()).toEqual([
      "alcohol",
      "betting",
      "children",
      "education",
      "finance",
      "health",
      "politics",
      "tobacco",
    ]);
  });
});

describe("splitHold and buildHold", () => {
  it("separates restricted categories from the tenant's words", () => {
    expect(splitHold([" Alcohol", "wedding  cakes", "alcohol", "", "health"])).toEqual({
      restricted: ["alcohol", "health"],
      words: ["wedding cakes"],
    });
    expect(splitHold(undefined)).toEqual({ restricted: [], words: [] });
  });

  it("saves restricted categories first, then words, without repeats", () => {
    expect(buildHold(["alcohol", "health"], ["cakes", "Cakes "])).toEqual(["health", "alcohol", "cakes"]);
  });
});

describe("addHoldWord", () => {
  it("adds a normalised word", () => {
    expect(addHoldWord([], [], "  Wedding   Cakes ")).toEqual({ restricted: [], words: ["wedding cakes"] });
  });

  it("ticks a restricted category typed as a word", () => {
    expect(addHoldWord([], [], "Betting")).toEqual({ restricted: ["betting"], words: [] });
  });

  it("refuses empty, long, repeated and over-limit entries", () => {
    expect(addHoldWord([], [], "  ").error).toBeTruthy();
    expect(addHoldWord([], [], "x".repeat(61)).error).toBeTruthy();
    expect(addHoldWord([], ["cakes"], "Cakes").error).toBeTruthy();
    const full = Array.from({ length: MAX_HOLD_ENTRIES }, (_, i) => `w${i}`);
    expect(addHoldWord([], full, "one more").error).toBeTruthy();
  });
});

describe("normalizeHoldWord and holdChanged", () => {
  it("compares regardless of order and case", () => {
    expect(normalizeHoldWord(" Gin  Bar ")).toBe("gin bar");
    expect(holdChanged(["Cakes", "alcohol"], ["alcohol", "cakes"])).toBe(false);
    expect(holdChanged(["alcohol"], ["alcohol", "cakes"])).toBe(true);
    expect(holdChanged(undefined, [])).toBe(false);
  });
});
