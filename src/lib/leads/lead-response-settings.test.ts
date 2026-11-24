import { describe, expect, it } from "vitest";
import {
  describeHours,
  formatMinutes,
  leadResponsePatch,
  leadResponseProblems,
  parseReminder,
  shortMinutes,
  uncontactedFor,
  type LeadResponseView,
} from "./lead-response-settings";

const platform: LeadResponseView = {
  follow_up: true,
  reminder_minutes: [15, 120, 1440],
  business_days: [1, 2, 3, 4, 5, 6],
  business_hours: { open: "08:00", close: "18:00" },
  daily_list: true,
};

describe("lead response settings", () => {
  it("reads and writes reminder times", () => {
    expect(parseReminder("15m")).toBe(15);
    expect(parseReminder(" 2h ")).toBe(120);
    expect(parseReminder("1d")).toBe(1440);
    expect(parseReminder("1h30m")).toBe(90);
    expect(parseReminder("45")).toBe(45);
    expect(parseReminder("soon")).toBeNull();
    expect(parseReminder("2x")).toBeNull();
    expect(shortMinutes(15)).toBe("15m");
    expect(shortMinutes(120)).toBe("2h");
    expect(shortMinutes(1440)).toBe("1d");
    expect(shortMinutes(90)).toBe("1h30m");
    expect(formatMinutes(1500)).toBe("1 day 1 hour");
    expect(formatMinutes(15)).toBe("15 minutes");
  });

  it("refuses what the API refuses", () => {
    expect(leadResponseProblems(platform)).toEqual([]);
    expect(leadResponseProblems({ ...platform, reminder_minutes: [120, 15] })).toContain("Reminder times must go up, the earliest first.");
    expect(leadResponseProblems({ ...platform, business_days: [] })).toContain("Pick at least one business day.");
    expect(leadResponseProblems({ ...platform, business_hours: { open: "18:00", close: "08:00" } })).toContain(
      "Opening time must be before closing time.",
    );
    expect(leadResponseProblems({ ...platform, business_hours: { open: "8:00", close: "18:00" } })).toContain("Opening hours must be HH:MM times.");
  });

  it("saves only what differs from the platform default", () => {
    expect(leadResponsePatch(platform, platform)).toBeNull();
    expect(leadResponsePatch({ ...platform, follow_up: false, business_days: [5, 1, 2, 3, 4] }, platform)).toEqual({
      follow_up: false,
      business_days: [1, 2, 3, 4, 5],
    });
  });

  it("describes the hours", () => {
    expect(describeHours(platform)).toBe("Mon to Sat, 08:00 to 18:00");
    expect(describeHours({ ...platform, business_days: [0, 1, 2, 3, 4, 5, 6] })).toBe("Every day, 08:00 to 18:00");
    expect(describeHours({ ...platform, business_days: [1, 3] })).toBe("Mon, Wed, 08:00 to 18:00");
  });

  it("labels how long a new lead has waited", () => {
    const now = new Date("2026-11-24T12:00:00Z");
    expect(uncontactedFor("new", "2026-11-24T11:40:00Z", now)).toBe("20m");
    expect(uncontactedFor("new", "2026-11-24T09:00:00Z", now)).toBe("3h");
    expect(uncontactedFor("new", "2026-11-21T12:00:00Z", now)).toBe("3d");
    expect(uncontactedFor("contacted", "2026-11-21T12:00:00Z", now)).toBeNull();
  });
});
