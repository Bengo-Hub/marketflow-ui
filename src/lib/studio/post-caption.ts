/**
 * The Studio publish dialog's default caption: the ad's words, the lead page link, and for a
 * pharmacy's medicine ad its PPB approval line (pharmacy hand-off 2026-11-14), so the post always
 * shows "PPB approval ref. ...". The line comes from the approved version's
 * metadata.ppb_approval.caption_line (marketflow-api creative.MetaPPBApproval).
 */

/** The version's PPB approval line, or "". */
export function ppbCaptionLine(metadata: Record<string, unknown> | undefined): string {
  const ppb = metadata?.ppb_approval;
  if (!ppb || typeof ppb !== "object") return "";
  const line = (ppb as { caption_line?: unknown }).caption_line;
  return typeof line === "string" ? line.trim() : "";
}

/** Joins the caption parts with blank lines; the PPB line always comes last and only once. */
export function defaultPostCaption(caption: string, leadUrl: string | undefined, metadata: Record<string, unknown> | undefined): string {
  const parts = [caption.trim(), leadUrl?.trim() ?? ""].filter(Boolean);
  const line = ppbCaptionLine(metadata);
  if (line && !parts.some((p) => p.includes(line))) parts.push(line);
  return parts.join("\n\n");
}

/** The ad's own words, one per line. A poster keeps them on the copy, a video ad on its end card. */
export function adWords(copy: Record<string, unknown> | null | undefined): string {
  const card = copy?.end_card && typeof copy.end_card === "object" ? (copy.end_card as Record<string, unknown>) : {};
  return ["headline", "subline", "cta"]
    .map((k) => copy?.[k] ?? card[k])
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .map((v) => v.trim())
    .join("\n");
}
