import { PLATFORM_LABEL, type Platform, type PublishAccount, type PublishJob } from "@/lib/api/publishing";

/**
 * Delete from platform (owner 2026-11-14): a post MarketFlow published can be deleted from the
 * platform where its API allows it (Facebook Page, Instagram with the delete permission, YouTube
 * with a delete scope). Elsewhere (TikTok, or an account without the permission) the tenant
 * deletes it on the platform, and we show the platform's own steps.
 */

/** Platform steps when the API does not answer with its own (an older job or an error). */
const FALLBACK_STEPS: Record<Platform, string[]> = {
  facebook: ["Open the reel on your Facebook Page.", "Select the three dots at the top right of the post.", "Select Delete and confirm."],
  instagram: ["Open the reel in the Instagram app.", "Tap the three dots on the reel.", "Tap Delete and confirm."],
  youtube: [
    "Sign in to YouTube Studio.",
    "Select Content and find the Short.",
    "Point to the video, select the three dots (Options) and choose Delete forever.",
  ],
  tiktok: ["Open the video in the TikTok app.", "Tap the three dots (or the Share button) on the video.", "Tap Delete and confirm."],
};

export type DeleteAction =
  | { kind: "delete"; label: string }
  | { kind: "manual"; label: string; reason?: string; steps: string[]; helpUrl?: string };

/** What a published post offers: delete it from MarketFlow, or the steps to delete it there. */
export function deleteAction(job: Pick<PublishJob, "status" | "platform" | "can_delete_on_platform" | "delete_unavailable_reason" | "delete_steps" | "delete_help_url">): DeleteAction | null {
  if (job.status !== "published") return null;
  const name = PLATFORM_LABEL[job.platform] ?? job.platform;
  if (job.can_delete_on_platform) return { kind: "delete", label: "Delete from platform" };
  return {
    kind: "manual",
    label: `Delete it on ${name}`,
    reason: job.delete_unavailable_reason ? sentence(job.delete_unavailable_reason) : undefined,
    steps: job.delete_steps?.length ? job.delete_steps : (FALLBACK_STEPS[job.platform] ?? []),
    helpUrl: job.delete_help_url,
  };
}

/**
 * A 409 delete_unsupported answer (the permission changed since the list loaded) carries the
 * platform's steps in details; this reads them so the dialog can switch to the manual steps.
 */
export function unsupportedFromError(e: unknown, platform: Platform): Extract<DeleteAction, { kind: "manual" }> | null {
  const data = (e as { response?: { status?: number; data?: { code?: unknown; error?: unknown; details?: Record<string, unknown> } } })?.response;
  if (data?.data?.code !== "delete_unsupported") return null;
  const d = data.data.details ?? {};
  const steps = Array.isArray(d.steps) ? d.steps.filter((s): s is string => typeof s === "string") : [];
  const name = PLATFORM_LABEL[platform] ?? platform;
  return {
    kind: "manual",
    label: `Delete it on ${name}`,
    reason: typeof data.data.error === "string" ? sentence(data.data.error) : undefined,
    steps: steps.length ? steps : (FALLBACK_STEPS[platform] ?? []),
    helpUrl: typeof d.help_url === "string" ? d.help_url : undefined,
  };
}

/**
 * The hint on an account connected before MarketFlow asked to delete posts. Only an account that
 * can otherwise post gets it; a blocked one already says "Reconnect".
 */
export function reconnectToDeleteHint(a: Pick<PublishAccount, "enabled" | "needs_reconnect" | "needs_reconnect_to_delete">): string | null {
  if (!a.enabled || a.needs_reconnect || !a.needs_reconnect_to_delete) return null;
  return "Reconnect to allow deleting";
}

/** The confirm text: what goes and what stays. */
export function deleteConfirmText(platform: Platform): string {
  const name = PLATFORM_LABEL[platform] ?? platform;
  return `The post is removed from ${name} for everyone, with its views, likes and comments. This cannot be undone.`;
}

/** The server writes reasons in lower case mid-sentence; show them as a sentence. */
function sentence(s: string): string {
  const t = s.trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}
