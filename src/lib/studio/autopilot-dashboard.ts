import type { AgentRun, AutopilotWeek, PendingDraft } from "@/lib/api/autopilot";
import type { Tone } from "@/components/ui-kit";

/** A run's status in words and its badge tone. */
export function runStatus(run: Pick<AgentRun, "status">): { label: string; tone: Tone } {
  switch (run.status) {
    case "completed":
      return { label: "Drafted", tone: "success" };
    case "skipped":
      return { label: "Skipped", tone: "warning" };
    case "failed":
      return { label: "Failed", tone: "danger" };
    case "cancelled":
      return { label: "Cancelled", tone: "neutral" };
    case "pending":
    case "running":
      return { label: "Running", tone: "info" };
    default:
      return { label: run.status || "Unknown", tone: "neutral" };
  }
}

/** Why a run was skipped, in one line, from its trace (worker/autopilot_run.go record). */
export function skipReason(run: Pick<AgentRun, "status" | "trace" | "error_message">): string {
  if (run.status !== "skipped") return "";
  switch (run.trace?.skip) {
    case "credits":
      return "AI credits were low.";
    case "ad_funds":
      return "The ad account could not pay for the next ad.";
    case "ad_ceiling":
      return "Its ads reached this month's ad ceiling.";
    case "ended":
      return "Its last day had passed.";
    default:
      return run.error_message ?? "";
  }
}

/** How a run started, for the history list. */
export function runTrigger(run: Pick<AgentRun, "triggered_by">): string {
  switch (run.triggered_by) {
    case "schedule":
      return "On schedule";
    case "manual":
    case "button":
      return "Draft one now";
    case "":
    case undefined:
      return "";
    default:
      return "Rule";
  }
}

/** What a pending draft waits for: the script to review, or the finished ad to approve and post. */
export function draftStep(d: Pick<PendingDraft, "status">): string {
  return d.status === "script_ready" ? "Script to review" : "Ready to approve and post";
}

/** The Studio page of a pending draft. */
export function draftHref(orgSlug: string, d: Pick<PendingDraft, "brief_id">): string {
  return `/${orgSlug}/studio/${d.brief_id}`;
}

/** True when the week has nothing to show yet. */
export function weekIsEmpty(w: AutopilotWeek | undefined): boolean {
  return !w || (w.ads_made === 0 && w.credits === 0 && w.spend === 0 && w.leads === 0);
}

/** Cost per lead in words; "No leads yet" when there are none. */
export function costPerLead(w: Pick<AutopilotWeek, "leads" | "cpl">, format: (n: number) => string): string {
  return w.leads > 0 ? format(w.cpl) : "No leads yet";
}
