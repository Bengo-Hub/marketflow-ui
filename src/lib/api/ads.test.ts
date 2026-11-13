import { describe, expect, it } from "vitest";
import { liveShortfall, timeAgo } from "./ads";

describe("boost funding (Sprint 18 L62)", () => {
  it("prefers the live shortfall from the last check on Meta", () => {
    const quote = { shortfall: 3500, budget: 5000 };
    expect(liveShortfall({ funding: "needs_funds", shortfall: 1200 }, quote)).toBe(1200);
    expect(liveShortfall(undefined, quote)).toBe(3500);
    expect(liveShortfall({ funding: "prepaid", shortfall: 0 }, quote)).toBe(3500);
    expect(liveShortfall(undefined, { shortfall: 0, budget: 5000 })).toBe(5000);
  });

  it("says how long ago the balance was checked", () => {
    const now = new Date("2026-11-12T10:00:00Z");
    expect(timeAgo("2026-11-12T09:59:40Z", now)).toBe("just now");
    expect(timeAgo("2026-11-12T09:55:00Z", now)).toBe("5 min ago");
    expect(timeAgo("2026-11-12T07:30:00Z", now)).toBe("2 h ago");
    expect(timeAgo("not a date", now)).toBe("just now");
  });
});
