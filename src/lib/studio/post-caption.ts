/**
 * The ad's own words, one per line. A poster keeps them on the copy, a video ad on its end card.
 * The whole caption (contacts, lead page link, PPB line) is written by marketflow-api's post plan,
 * so the Studio, WhatsApp and the autopilot post the same one.
 */
export function adWords(copy: Record<string, unknown> | null | undefined): string {
  const card = copy?.end_card && typeof copy.end_card === "object" ? (copy.end_card as Record<string, unknown>) : {};
  return ["headline", "subline", "cta"]
    .map((k) => copy?.[k] ?? card[k])
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .map((v) => v.trim())
    .join("\n");
}
