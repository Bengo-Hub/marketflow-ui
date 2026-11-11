/**
 * Sprint 23 L45: the business's sales follow-up settings, kept in tenant metadata
 * (marketflow-api tenant.SalesHandoffValueKey / SalesAutoReplyKey).
 */
export interface SalesFollowUpSettings {
  /** The assistant answers leads who reply on WhatsApp (unset means on). */
  autoReply: boolean;
  /** Budget at or above which a lead goes to a person; null means amounts never hand off. */
  handoffValue: number | null;
}

export const MAX_HANDOFF_VALUE = 100_000_000_000;

export function salesSettingsFrom(meta: Record<string, unknown> | undefined): SalesFollowUpSettings {
  const v = meta?.sales_handoff_value;
  return {
    autoReply: meta?.sales_auto_reply !== false,
    handoffValue: typeof v === "number" && v > 0 ? v : null,
  };
}

/**
 * Reads a typed amount: "150000", "150,000", "150k", "1.2m". Empty means no amount.
 * Returns undefined when the text is not an amount.
 */
export function parseHandoffAmount(text: string): number | null | undefined {
  const t = text.trim().toLowerCase().replace(/,/g, "").replace(/^kes\s*/, "");
  if (!t) return null;
  const m = /^(\d+(?:\.\d+)?)\s*(k|m)?$/.exec(t);
  if (!m) return undefined;
  let n = Number(m[1]);
  if (m[2] === "k") n *= 1_000;
  if (m[2] === "m") n *= 1_000_000;
  if (!Number.isFinite(n) || n > MAX_HANDOFF_VALUE) return undefined;
  return n === 0 ? null : Math.round(n);
}

/** The metadata patch that saves the settings (null clears the amount). */
export function salesSettingsPatch(s: SalesFollowUpSettings) {
  return { sales_auto_reply: s.autoReply, sales_handoff_value: s.handoffValue };
}
