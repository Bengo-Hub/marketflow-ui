import type { Tone } from "@/components/ui-kit/status-badge";

/** Query for GET /api/v1/admin/platform/cost-report. */
export interface CostReportQuery {
  month: string;
  page?: number;
  page_size?: number;
}

export const COST_REPORT_PAGE_SIZE = 50;

/** "2026-11" for the month that holds `now`, in local time. */
export function monthKey(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

/** The current month: the report opens on it. */
export function defaultMonth(now: Date = new Date()): string {
  return monthKey(now);
}

/** "2026-11" reads as "Nov 2026". */
export function monthLabel(key: string): string {
  const [y, m] = key.split("-").map(Number);
  if (!y || !m) return key;
  return new Date(y, m - 1, 1).toLocaleDateString("en-KE", { month: "short", year: "numeric" });
}

/** The current month and the `count - 1` before it, newest first. */
export function monthOptions(now: Date = new Date(), count = 6): { value: string; label: string }[] {
  const out: { value: string; label: string }[] = [];
  for (let i = 0; i < Math.max(1, count); i++) {
    const key = monthKey(new Date(now.getFullYear(), now.getMonth() - i, 1));
    out.push({ value: key, label: monthLabel(key) });
  }
  return out;
}

/** month=2026-11&page=1&page_size=50, skipping a page or size that is not a positive whole number. */
export function costReportQueryString(q: CostReportQuery): string {
  const params = new URLSearchParams({ month: q.month });
  if (q.page && Number.isInteger(q.page) && q.page > 0) params.set("page", String(q.page));
  if (q.page_size && Number.isInteger(q.page_size) && q.page_size > 0) params.set("page_size", String(q.page_size));
  return params.toString();
}

/** A margin ratio (0.42) as "42%" or "42.5%"; no margin (nothing charged) shows a dash. */
export function formatMargin(margin: number | null | undefined): string {
  if (margin === null || margin === undefined || !Number.isFinite(margin)) return "-";
  const pct = Math.round(margin * 1000) / 10;
  return `${pct.toLocaleString("en-KE", { maximumFractionDigits: 1 })}%`;
}

/** True when the margin sits under the floor the API reported, or the API already flagged it. */
export function isBelowFloor(margin: number | null | undefined, floor: number, flagged = false): boolean {
  if (flagged) return true;
  if (margin === null || margin === undefined || !Number.isFinite(margin)) return false;
  return margin < floor;
}

/** Danger under the floor, success at or above it, neutral with no margin. */
export function marginTone(margin: number | null | undefined, floor: number, flagged = false): Tone {
  if (isBelowFloor(margin, floor, flagged)) return "danger";
  if (margin === null || margin === undefined || !Number.isFinite(margin)) return "neutral";
  return "success";
}

/** "Below 30% floor", built from the floor the API sent. */
export function floorLabel(floor: number): string {
  return `Below ${formatMargin(floor)} floor`;
}
