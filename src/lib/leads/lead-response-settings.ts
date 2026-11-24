/**
 * Item 62, lead response (owner decisions of 2026-11-24): the automatic follow-up to new leads, the
 * reminders to the team for leads nobody contacted (counted in business hours) and the daily list of
 * uncontacted leads. Platform defaults come from marketflow-api (service_config lead_response.*);
 * the tenant's own values are saved as metadata.lead_response through the profile PATCH, by the
 * owner or an admin only.
 */

export interface LeadResponseView {
  follow_up: boolean;
  /** Minutes of business time after a lead arrives, ascending. */
  reminder_minutes: number[];
  /** 0 is Sunday. */
  business_days: number[];
  business_hours: { open: string; close: string };
  daily_list: boolean;
}

/** GET /api/v1/tenant/profile/lead-response. */
export interface LeadResponseResponse {
  platform: LeadResponseView;
  effective: LeadResponseView;
  /** Only the keys the tenant set itself. */
  tenant: Partial<LeadResponseView>;
  timezone: string;
  /** The tenant's own lead follow-up sequence, null when it has none. */
  sequence: { id: string; name: string; active: boolean; steps: number; is_default: boolean } | null;
  can_edit: boolean;
}

export const WEEKDAYS: { day: number; short: string; long: string }[] = [
  { day: 1, short: "Mon", long: "Monday" },
  { day: 2, short: "Tue", long: "Tuesday" },
  { day: 3, short: "Wed", long: "Wednesday" },
  { day: 4, short: "Thu", long: "Thursday" },
  { day: 5, short: "Fri", long: "Friday" },
  { day: 6, short: "Sat", long: "Saturday" },
  { day: 0, short: "Sun", long: "Sunday" },
];

/** The API's limits (marketflow-api leadresponse.Validate). */
export const MAX_REMINDERS = 5;
export const MAX_REMINDER_MINUTES = 7 * 24 * 60;

/** "15 minutes", "2 hours", "1 day 2 hours". */
export function formatMinutes(min: number): string {
  const d = Math.floor(min / 1440);
  const h = Math.floor((min % 1440) / 60);
  const m = min % 60;
  const part = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;
  const out: string[] = [];
  if (d) out.push(part(d, "day"));
  if (h) out.push(part(h, "hour"));
  if (m || out.length === 0) out.push(part(m, "minute"));
  return out.join(" ");
}

/**
 * Reads a reminder written as "15m", "2h", "1d", "90" (minutes) or "1h30m"; null when unreadable.
 */
export function parseReminder(text: string): number | null {
  const t = text.trim().toLowerCase().replace(/\s+/g, "");
  if (!t) return null;
  if (/^\d+$/.test(t)) return Number(t);
  const re = /(\d+)(d|h|m)/g;
  let total = 0;
  let consumed = 0;
  for (const m of t.matchAll(re)) {
    const n = Number(m[1]);
    total += m[2] === "d" ? n * 1440 : m[2] === "h" ? n * 60 : n;
    consumed += m[0].length;
  }
  return consumed === t.length && total > 0 ? total : null;
}

/** A reminder written back the short way: "15m", "2h", "1d", "1h30m". */
export function shortMinutes(min: number): string {
  if (min % 1440 === 0) return `${min / 1440}d`;
  if (min % 60 === 0) return `${min / 60}h`;
  if (min > 60) return `${Math.floor(min / 60)}h${min % 60}m`;
  return `${min}m`;
}

/** What stops a save. */
export function leadResponseProblems(v: LeadResponseView): string[] {
  const out: string[] = [];
  const r = v.reminder_minutes;
  if (r.length === 0 || r.length > MAX_REMINDERS) out.push(`Set 1 to ${MAX_REMINDERS} reminder times.`);
  if (r.some((m) => !Number.isInteger(m) || m < 1 || m > MAX_REMINDER_MINUTES)) out.push("Each reminder must be between 1 minute and 7 days.");
  if (r.some((m, i) => i > 0 && m <= r[i - 1])) out.push("Reminder times must go up, the earliest first.");
  if (v.business_days.length === 0) out.push("Pick at least one business day.");
  const hhmm = /^([01]\d|2[0-3]):[0-5]\d$|^24:00$/;
  if (!hhmm.test(v.business_hours.open) || !hhmm.test(v.business_hours.close)) out.push("Opening hours must be HH:MM times.");
  else if (v.business_hours.open >= v.business_hours.close) out.push("Opening time must be before closing time.");
  return out;
}

/**
 * The metadata.lead_response a save sends: only the values that differ from the platform default,
 * so a later change to a default still reaches the tenant; null when everything matches the
 * defaults (clears the tenant's overrides).
 */
export function leadResponsePatch(v: LeadResponseView, platform: LeadResponseView): Partial<LeadResponseView> | null {
  const out: Partial<LeadResponseView> = {};
  if (v.follow_up !== platform.follow_up) out.follow_up = v.follow_up;
  if (v.daily_list !== platform.daily_list) out.daily_list = v.daily_list;
  if (!sameList(v.reminder_minutes, platform.reminder_minutes)) out.reminder_minutes = v.reminder_minutes;
  const days = [...v.business_days].sort((a, b) => a - b);
  if (!sameList(days, [...platform.business_days].sort((a, b) => a - b))) out.business_days = days;
  if (v.business_hours.open !== platform.business_hours.open || v.business_hours.close !== platform.business_hours.close) {
    out.business_hours = { ...v.business_hours };
  }
  return Object.keys(out).length ? out : null;
}

function sameList(a: number[], b: number[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** "Mon to Sat, 08:00 to 18:00". */
export function describeHours(v: LeadResponseView): string {
  const order = WEEKDAYS.filter((w) => v.business_days.includes(w.day));
  let days = order.map((w) => w.short).join(", ");
  const idx = order.map((w) => WEEKDAYS.indexOf(w));
  if (order.length > 2 && idx.every((x, i) => i === 0 || x === idx[i - 1] + 1)) {
    days = `${order[0].short} to ${order[order.length - 1].short}`;
  }
  if (order.length === 7) days = "Every day";
  return `${days}, ${v.business_hours.open} to ${v.business_hours.close}`;
}

/**
 * The "uncontacted for X" label for a lead still new: how long since it arrived, or null for any
 * other status.
 */
export function uncontactedFor(status: string, createdAt: string, now: Date = new Date()): string | null {
  if (status !== "new") return null;
  const ms = now.getTime() - new Date(createdAt).getTime();
  if (!Number.isFinite(ms) || ms < 0) return null;
  const min = Math.floor(ms / 60_000);
  if (min < 60) return `${Math.max(min, 1)}m`;
  const h = Math.floor(min / 60);
  if (h < 48) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
