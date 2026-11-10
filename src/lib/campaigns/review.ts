export type ReviewTone = "info" | "warning" | "success" | "danger";

/** Where a boost stands with Meta, from the launch state marketflow-api keeps (Sprint 18 L63). */
export function metaReviewLabel(campaign: { metadata?: Record<string, unknown> | null }): { text: string; tone: ReviewTone } | null {
  const launch = campaign.metadata?.launch as { state?: Record<string, unknown> } | undefined;
  const st = launch?.state;
  if (!st || typeof st.stage !== "string") return null;
  switch (st.stage) {
    case "live":
      return { text: "Live on Meta", tone: "success" };
    case "funding":
      return { text: "Approved, waiting for funds", tone: "warning" };
    case "failed":
      return { text: typeof st.error === "string" && st.error ? st.error : "The boost did not start", tone: "danger" };
    case "review":
      return { text: "Meta is reviewing the ad", tone: "info" };
    default:
      return { text: "Setting up on Meta", tone: "info" };
  }
}
