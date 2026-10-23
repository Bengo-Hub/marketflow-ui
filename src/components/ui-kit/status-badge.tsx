import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "neutral" | "info" | "warning" | "success" | "primary" | "danger";

const TONE: Record<Tone, string> = {
  neutral: "border-border bg-muted text-muted-foreground",
  info: "border-info/20 bg-info/10 text-info",
  warning: "border-warning/25 bg-warning/10 text-warning",
  success: "border-success/20 bg-success/10 text-success",
  primary: "border-primary/20 bg-primary/10 text-primary",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
};

/**
 * One status vocabulary for every list in the app (leads, deals, tasks, campaigns, funnels,
 * sequences, meetings, enrollments). Pages pass the raw API value; unknown values show neutral.
 */
const STATUS_TONE: Record<string, Tone> = {
  new: "info",
  open: "info",
  draft: "neutral",
  scheduled: "info",
  pending: "warning",
  contacted: "warning",
  rescheduled: "warning",
  paused: "warning",
  in_progress: "warning",
  qualified: "success",
  active: "success",
  published: "success",
  completed: "success",
  won: "success",
  sent: "success",
  delivered: "success",
  converted: "primary",
  lost: "danger",
  overdue: "danger",
  failed: "danger",
  cancelled: "danger",
  no_show: "danger",
  archived: "neutral",
  inactive: "neutral",
};

export function statusTone(status?: string | null): Tone {
  return STATUS_TONE[(status ?? "").toLowerCase()] ?? "neutral";
}

/** "no_show" reads as "No show". */
export function humanize(value?: string | null): string {
  if (!value) return "";
  const s = value.replace(/[_-]+/g, " ").trim();
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function ToneBadge({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 shrink-0 items-center gap-1 rounded-full border px-2.5 text-xs font-semibold whitespace-nowrap [&>svg]:size-3",
        TONE[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StatusBadge({ status, label, className }: { status?: string | null; label?: string; className?: string }) {
  if (!status) return null;
  return (
    <ToneBadge tone={statusTone(status)} className={className}>
      {label ?? humanize(status)}
    </ToneBadge>
  );
}
