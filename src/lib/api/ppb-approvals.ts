import { apiClient } from "./client";

/**
 * PPB advert approval references (marketflow-api creative/ppb_approval.go, owner 2026-11-14). For a
 * pharmacy, an ad that promotes a medicine stays a draft until the owner enters the Pharmacy and
 * Poisons Board's approval reference for that product: it cannot be approved, rendered, posted or
 * boosted before. Products that are not medicines and other business types are never held.
 */

/** One product's reference, stored in the tenant's settings. */
export interface PPBApproval {
  offering_key: string;
  offering_name?: string;
  reference: string;
  entered_by?: string;
  entered_at: string;
}

/** GET /creative/briefs/{id}/ppb-approval: whether the ad needs a reference, and the one it has. */
export interface PPBStatus {
  pharmacy: boolean;
  medicine: boolean;
  required: boolean;
  offering_key?: string;
  offering_name?: string;
  approval?: PPBApproval | null;
  caption_line?: string;
}

const base = "/api/v1/creative";

export const ppbApprovalsApi = {
  list: () =>
    apiClient
      .get<{ approvals: PPBApproval[] | null; pharmacy: boolean }>(`${base}/ppb-approvals`)
      .then((r) => ({ approvals: r.data.approvals ?? [], pharmacy: r.data.pharmacy })),
  /** Saves a product's reference; an empty reference removes it. Owner or admin only. */
  set: (data: { offering_key: string; offering_name?: string; reference: string }) =>
    apiClient.put<{ approval: PPBApproval | null }>(`${base}/ppb-approvals`, data).then((r) => r.data.approval),
  forBrief: (briefId: string) => apiClient.get<PPBStatus>(`${base}/briefs/${briefId}/ppb-approval`).then((r) => r.data),
};

/** True when the ad is held: a pharmacy's medicine ad without a reference. */
export function isPPBHeld(s: PPBStatus | undefined): boolean {
  return !!s?.required && !s.approval;
}

/** The line the ad carries, the same words marketflow-api puts on the end card and poster. */
export function ppbCaptionLine(reference: string): string {
  return `PPB approval ref. ${reference}`;
}

/** The server's form: letters, digits and / . _ # ( ) - with single spaces, 3 to 80 characters. */
const REFERENCE = /^[A-Za-z0-9][A-Za-z0-9 /._#()-]{2,79}$/;

/** Tidies a typed reference the way the server does: trimmed, runs of spaces made one. */
export function normalizePPBReference(input: string): string {
  return input.trim().split(/\s+/).filter(Boolean).join(" ");
}

/** Why a typed reference would be refused, or null when it looks right. */
export function ppbReferenceError(input: string): string | null {
  const ref = normalizePPBReference(input);
  if (!ref) return "Enter the approval reference from the Board's letter.";
  if (!REFERENCE.test(ref)) return "Use 3 to 80 letters, digits, spaces or / . _ # ( ) -, starting with a letter or digit.";
  return null;
}

/** Who entered a reference, for the Settings list: "You", the member's email, or a fallback. */
export function enteredByLabel(userId: string | undefined, members: { id: string; email: string; you?: boolean }[] | undefined): string {
  if (!userId) return "Not recorded";
  const m = members?.find((x) => x.id === userId);
  if (!m) return "A team member";
  return m.you ? "You" : m.email;
}

/** The Settings list order: by product name, then key, ignoring case. */
export function sortPPBApprovals(list: PPBApproval[]): PPBApproval[] {
  const name = (a: PPBApproval) => (a.offering_name || a.offering_key).toLowerCase();
  return [...list].sort((a, b) => name(a).localeCompare(name(b)) || a.offering_key.localeCompare(b.offering_key));
}

/** True when an API call was refused because the ad needs a PPB approval reference. */
export function isPPBApprovalRequired(e: unknown): boolean {
  const res = (e as { response?: { status?: number; data?: { code?: unknown } } })?.response;
  return res?.status === 409 && res?.data?.code === "ppb_approval_required";
}

/** The product named by a ppb_approval_required answer, for the card that asks for its reference. */
export function ppbRequiredProduct(e: unknown): { offering_key: string; offering_name: string } | null {
  if (!isPPBApprovalRequired(e)) return null;
  const d = (e as { response: { data?: { details?: { offering_key?: unknown; offering_name?: unknown } } } }).response.data?.details;
  if (typeof d?.offering_key !== "string" || !d.offering_key) return null;
  return { offering_key: d.offering_key, offering_name: typeof d.offering_name === "string" ? d.offering_name : "" };
}
