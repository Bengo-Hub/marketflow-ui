import { describe, expect, it } from "vitest";
import { justCompleted, shouldOpenOnboarding } from "./onboarding-flow";

const c = (complete: boolean, dismissed: boolean) => ({ steps: [], done: 0, total: 5, complete, dismissed });

describe("onboarding flow", () => {
  it("opens setup once for an unfinished business", () => {
    expect(shouldOpenOnboarding(c(false, false), false)).toBe(true);
    expect(shouldOpenOnboarding(c(false, false), true)).toBe(false);
    expect(shouldOpenOnboarding(c(true, false), false)).toBe(false);
    expect(shouldOpenOnboarding(c(false, true), false)).toBe(false);
    expect(shouldOpenOnboarding(undefined, false)).toBe(false);
  });

  it("goes to the dashboard only when setup completes during the visit", () => {
    expect(justCompleted(false, true)).toBe(true);
    expect(justCompleted(undefined, true)).toBe(false);
    expect(justCompleted(true, true)).toBe(false);
  });
});
