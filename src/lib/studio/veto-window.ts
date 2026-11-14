import type { AutopilotPost, AutoPublishStatus, VetoJob } from "@/lib/api/autopilot";

/**
 * Veto window (Sprint 20, owner 2026-11-14): an autopilot agent may post a finished video by itself
 * after a window of hours unless the owner cancels it. These helpers keep the page's rules in one
 * tested place: who may choose the mode, the hours allowed, the countdown and which posts can still
 * be cancelled.
 */

export type ApprovalMode = "approve_each" | "auto_publish";

/** The mode can be offered when the plan includes it; the terms are accepted on the way. */
export function canOfferVetoWindow(status: AutoPublishStatus | undefined): boolean {
  return !!status?.plan_allows;
}

/** Saving the veto window needs the plan and the current terms. */
export function canSaveVetoWindow(status: AutoPublishStatus | undefined, acceptingTerms: boolean): boolean {
  return !!status?.plan_allows && (status.terms_accepted || acceptingTerms);
}

/**
 * The terms are shown for acceptance when they were never accepted, or when a new version comes
 * into force on its effective date (owner 2026-11-14: 14 days after it is announced).
 */
export function needsTermsAcceptance(status: AutoPublishStatus | undefined): boolean {
  return !!status && !status.terms_unknown && (!status.terms_accepted || !!status.new_terms_pending);
}

/**
 * The page with the full terms on the accounts site: the version's own page when the terms are
 * published in auth-api (terms_url), else the terms page, which says when they are not published yet.
 */
export function termsPageUrl(status: AutoPublishStatus | undefined, accountsUrl: string): string {
  if (status?.terms_url) return status.terms_url;
  return `${accountsUrl.replace(/\/$/, "")}/legal/marketflow-autopublish-terms`;
}

/**
 * Owner 2026-11-14: an owner or admin may cancel one account's post at a time. Offered only while
 * the window is open and more than one account's post still waits; with one left, the main
 * Cancel button does the same.
 */
export function cancellableJobs(post: Pick<AutopilotPost, "state" | "publish_at" | "jobs">, now: Date): VetoJob[] {
  if (post.state !== "scheduled" || !isCancellable(post, now)) return [];
  const waiting = (post.jobs ?? []).filter((j) => j.status === "pending");
  return waiting.length > 1 ? waiting : [];
}

/** Keeps the hours a whole number inside the allowed range; anything unreadable is the default. */
export function clampVetoHours(hours: number, status?: Pick<AutoPublishStatus, "min_veto_hours" | "max_veto_hours" | "default_veto_hours">): number {
  const min = status?.min_veto_hours ?? 1;
  const max = status?.max_veto_hours ?? 72;
  const fallback = status?.default_veto_hours ?? 4;
  if (!Number.isFinite(hours)) return fallback;
  return Math.min(max, Math.max(min, Math.round(hours)));
}

/** The time left before a post, in words: "3 h 12 min", "45 min", "under a minute", or "due now". */
export function countdown(publishAt: string | undefined, now: Date): string {
  if (!publishAt) return "";
  const ms = new Date(publishAt).getTime() - now.getTime();
  if (Number.isNaN(ms)) return "";
  if (ms <= 0) return "due now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "under a minute";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  return m === 0 ? `${h} h` : `${h} h ${m} min`;
}

/** A post can be cancelled while the agent is still making it or its window is open. */
export function isCancellable(post: Pick<AutopilotPost, "state" | "publish_at">, now: Date): boolean {
  if (post.state === "active") return true;
  if (post.state !== "scheduled") return false;
  if (!post.publish_at) return true;
  return new Date(post.publish_at).getTime() > now.getTime();
}

const stateLabels: Record<string, string> = {
  active: "Being made",
  scheduled: "Scheduled",
  held: "Waiting for your approval",
  vetoed: "Cancelled",
  released: "Posted",
  failed: "Could not be made",
  handed_over: "In your hands",
};

/** The dashboard's label for a post's state. */
export function postStateLabel(state: string): string {
  return stateLabels[state] ?? state;
}

/** Posts still worth showing at the top: being made, scheduled, or waiting for the owner. */
export function openPosts(posts: AutopilotPost[]): AutopilotPost[] {
  const rank: Record<string, number> = { scheduled: 0, active: 1, held: 2 };
  return posts
    .filter((p) => p.state in rank)
    .sort((a, b) => rank[a.state] - rank[b.state] || (a.publish_at ?? "").localeCompare(b.publish_at ?? ""));
}
