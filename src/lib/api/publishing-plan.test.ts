import { describe, expect, it } from "vitest";
import { cadenceLabel, windowLabel } from "./publishing";

describe("posting plan labels", () => {
  it("names day sets and day lists", () => {
    expect(windowLabel({ days: "weekdays", start: "12:00", end: "14:00" })).toBe("Weekdays 12:00 to 14:00");
    expect(windowLabel({ days: "weekend", start: "10:00", end: "12:00" })).toBe("Weekends 10:00 to 12:00");
    expect(windowLabel({ days: "mon, wed,fri", start: "07:00", end: "08:00" })).toBe("Mon, Wed, Fri 07:00 to 08:00");
  });
  it("reads a cadence", () => {
    expect(cadenceLabel({ count: 3, per: "week" })).toBe("3 a week");
    expect(cadenceLabel({ count: 0, per: "month" })).toBe("No posts");
  });
});
