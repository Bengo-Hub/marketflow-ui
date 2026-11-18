import { describe, expect, it } from "vitest";
import {
  costReportQueryString,
  defaultMonth,
  floorLabel,
  formatMargin,
  isBelowFloor,
  marginTone,
  monthKey,
  monthOptions,
} from "./platform-costs";

describe("platform cost report helpers", () => {
  it("shows a dash when there is no margin", () => {
    expect(formatMargin(null)).toBe("-");
    expect(formatMargin(undefined)).toBe("-");
    expect(formatMargin(Number.NaN)).toBe("-");
  });

  it("formats a margin ratio as a percentage", () => {
    expect(formatMargin(0.42)).toBe("42%");
    expect(formatMargin(0.425)).toBe("42.5%");
    expect(formatMargin(-0.1)).toBe("-10%");
    expect(formatMargin(0)).toBe("0%");
  });

  it("uses the floor from the response to pick the tone", () => {
    expect(marginTone(0.25, 0.3)).toBe("danger");
    expect(marginTone(0.3, 0.3)).toBe("success");
    expect(marginTone(0.25, 0.2)).toBe("success");
    expect(marginTone(0.35, 0.4)).toBe("danger");
    expect(marginTone(null, 0.3)).toBe("neutral");
    expect(marginTone(0.5, 0.3, true)).toBe("danger");
    expect(isBelowFloor(null, 0.3)).toBe(false);
    expect(isBelowFloor(0.1, 0.3)).toBe(true);
  });

  it("labels the floor from the response, not a fixed 30", () => {
    expect(floorLabel(0.3)).toBe("Below 30% floor");
    expect(floorLabel(0.25)).toBe("Below 25% floor");
  });

  it("defaults to the current month and lists earlier months newest first", () => {
    const now = new Date(2026, 1, 15); // 15 Feb 2026, local time
    expect(defaultMonth(now)).toBe("2026-02");
    expect(monthKey(new Date(2026, 10, 30))).toBe("2026-11");
    const months = monthOptions(now, 4).map((m) => m.value);
    expect(months).toEqual(["2026-02", "2026-01", "2025-12", "2025-11"]);
    expect(monthOptions(now, 1)[0].label).toMatch(/2026/);
    expect(monthOptions(now, 0)).toHaveLength(1);
  });

  it("builds the cost report query string", () => {
    expect(costReportQueryString({ month: "2026-11", page: 1, page_size: 50 })).toBe("month=2026-11&page=1&page_size=50");
    expect(costReportQueryString({ month: "2026-11" })).toBe("month=2026-11");
    expect(costReportQueryString({ month: "2026-11", page: 0, page_size: 2.5 })).toBe("month=2026-11");
  });
});
