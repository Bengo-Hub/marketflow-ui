import { describe, expect, it } from "vitest";
import { SENSITIVITY, sensitivityOf } from "./sensitivity";

describe("sensitivityOf", () => {
  it("reads unset bars as the standard preset", () => {
    expect(sensitivityOf(undefined, undefined)).toBe("standard");
    expect(sensitivityOf(null, null)).toBe("standard");
  });
  it("matches every preset", () => {
    for (const [k, v] of Object.entries(SENSITIVITY)) expect(sensitivityOf(v.intent, v.reply)).toBe(k);
  });
  it("calls anything else custom", () => {
    expect(sensitivityOf(0.6, null)).toBe("custom");
    expect(sensitivityOf(0.7, 0.9)).toBe("custom");
  });
});
