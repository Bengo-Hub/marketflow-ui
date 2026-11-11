import { describe, expect, it } from "vitest";
import { brandFormValues, mergeItems } from "./brand-form";

describe("brand form for Generate with AI", () => {
  it("sends only filled fields, lists one per line", () => {
    expect(
      brandFormValues({ positioning: "Shea butter", voice: " ", audience: ["Mums", "Students"], offers: [], proof: [], voice_examples: [], banned_claims: [], learnings: [] }),
    ).toEqual({ positioning: "Shea butter", audience: "Mums\nStudents" });
  });

  it("adds only new suggestions and keeps the owner's own first", () => {
    expect(mergeItems(["Mums"], ["mums", "Students", " ", "Students"])).toEqual(["Mums", "Students"]);
    expect(mergeItems(Array.from({ length: 19 }, (_, i) => `x${i}`), ["a", "b"]).length).toBe(20);
  });
});
