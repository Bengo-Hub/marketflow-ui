import { describe, expect, it } from "vitest";
import { faceFormProblem } from "./brand-faces";

describe("brand face form", () => {
  const ok = { imageId: "1", name: "Jane", until: "2027-01-01", under18: false as boolean | null, agreed: true };
  const check = (patch: Partial<typeof ok>) => faceFormProblem({ ...ok, ...patch }, "2026-11-25");
  it("needs every part of the consent", () => {
    expect(check({})).toBeNull();
    expect(check({ imageId: "" })).toMatch(/picture/);
    expect(check({ name: " " })).toMatch(/name/);
    expect(check({ until: "2026-11-01" })).toMatch(/date/);
    expect(check({ agreed: false })).toMatch(/agreed/);
  });
  it("refuses anyone under 18 and an unanswered age", () => {
    expect(check({ under18: true })).toMatch(/under 18/);
    expect(check({ under18: null })).toMatch(/under 18/);
  });
});
