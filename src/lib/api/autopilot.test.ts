import { describe, expect, it } from "vitest";
import { clampStopDays } from "./autopilot";

describe("autopilot CPL stop (Sprint 20)", () => {
  it("keeps the window within 1 to 14 days", () => {
    expect(clampStopDays(3)).toBe(3);
    expect(clampStopDays(0)).toBe(3);
    expect(clampStopDays(Number.NaN)).toBe(3);
    expect(clampStopDays(30)).toBe(14);
    expect(clampStopDays(2.4)).toBe(2);
  });
});
