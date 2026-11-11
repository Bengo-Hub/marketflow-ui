import type { BrandContext } from "@/lib/api/marketing-os";

const LIST_KEYS = ["audience", "offers", "proof", "voice_examples", "banned_claims", "learnings"] as const;

/** marketflow-api marketingos maxListLen. */
export const MAX_LIST = 20;

/** The brand form as plain values for "Generate with AI" (lists joined one per line). */
export function brandFormValues(b: BrandContext): Record<string, string> {
  const out: Record<string, string> = {};
  if (b.positioning?.trim()) out.positioning = b.positioning;
  if (b.voice?.trim()) out.voice = b.voice;
  for (const k of LIST_KEYS) if (b[k]?.length) out[k] = b[k].join("\n");
  return out;
}

/** Adds suggested items the list does not have yet (ignoring case), keeping the owner's own first. */
export function mergeItems(current: string[], suggested: string[]): string[] {
  const seen = new Set(current.map((c) => c.trim().toLowerCase()));
  const out = [...current];
  for (const s of suggested) {
    const k = s.trim().toLowerCase();
    if (k && !seen.has(k)) {
      seen.add(k);
      out.push(s.trim());
    }
  }
  return out.slice(0, MAX_LIST);
}
