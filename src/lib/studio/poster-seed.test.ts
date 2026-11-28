import { describe, expect, it } from "vitest";
import { posterSeed, readSeed } from "./poster-seed";

describe("posterSeed", () => {
  const brief = {
    headline: "One link. No duplicate gifts.",
    subline: "Gift lists and M-Pesa contributions in one place.",
    cta: "Create your registry free",
    image_prompt: "A smiling Kenyan couple at a celebration table. Setting: [NEED: owner's town or venue]. No text.",
    sizes: ["1080x1080"],
  };

  it("takes the team's words and drops the facts it did not have", () => {
    const s = posterSeed(brief)!;
    expect(s.headline).toBe("One link. No duplicate gifts.");
    expect(s.cta).toBe("Create your registry free");
    expect(s.prompt).not.toContain("NEED");
    expect(s.format).toBe("1080x1080");
  });

  it("needs a picture", () => {
    expect(posterSeed({ headline: "x" })).toBeNull();
    expect(posterSeed(null)).toBeNull();
  });

  it("falls back to square for an unknown size and round-trips through metadata", () => {
    const s = posterSeed({ ...brief, sizes: ["999x1"] })!;
    expect(s.format).toBe("1080x1080");
    expect(readSeed({ poster_seed: s })).toEqual(s);
    expect(readSeed({})).toBeNull();
  });
});
