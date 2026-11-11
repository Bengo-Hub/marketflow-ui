import { describe, expect, it } from "vitest";
import { AUDIENCE_PRESETS, audienceFor } from "./audience-presets";

// Sprint 18 L62: the boost wizard offers audience presets.
describe("audience presets", () => {
  it("defaults to all of Kenya, 18 and over", () => {
    expect(audienceFor("ke-all")).toEqual({ countries: ["KE"], age_min: 18, age_max: undefined });
    expect(audienceFor("nope")).toEqual(audienceFor("ke-all"));
  });
  it("has the East Africa preset", () => {
    expect(audienceFor("east-africa").countries).toEqual(["KE", "UG", "TZ"]);
    expect(AUDIENCE_PRESETS.length).toBe(4);
  });
});
