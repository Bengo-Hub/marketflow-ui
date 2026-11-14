/**
 * The tenant's "Always ask me first for" list (owner 2026-11-14), saved as hold_categories through
 * PUT /agents/autopilot/auto-publish. A video whose offering falls under one of them waits for a
 * person instead of being posted after the veto window. It applies to every autopilot agent of the
 * business.
 *
 * The restricted category keys must match marketflow-api's creative restrictedTerms (a Go test
 * there checks custom_agents.RestrictedHoldKeys against them). Anything else on the list is a word
 * or phrase the tenant added, matched as whole words in the offering's name, category and
 * description.
 */

export const RESTRICTED_HOLD_CATEGORIES: ReadonlyArray<{ key: string; label: string }> = [
  { key: "health", label: "Health, medicine and weight loss" },
  { key: "alcohol", label: "Alcohol" },
  { key: "tobacco", label: "Tobacco and vaping" },
  { key: "betting", label: "Betting and gambling" },
  { key: "finance", label: "Loans, credit and investments" },
  { key: "politics", label: "Politics and elections" },
  { key: "children", label: "Products for children and babies" },
  { key: "education", label: "Education and courses" },
];

/** Limits the API enforces: 20 entries, each up to 60 characters. */
export const MAX_HOLD_ENTRIES = 20;
export const MAX_HOLD_LENGTH = 60;

const restrictedKeys = new Set(RESTRICTED_HOLD_CATEGORIES.map((c) => c.key));

/** Lower case, trimmed, inner spaces collapsed: the form the API stores. */
export function normalizeHoldWord(s: string): string {
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

/** Splits the saved list into the restricted categories kept and the tenant's own words. */
export function splitHold(list: readonly string[] | undefined): { restricted: string[]; words: string[] } {
  const restricted: string[] = [];
  const words: string[] = [];
  for (const raw of list ?? []) {
    const v = normalizeHoldWord(raw);
    if (!v) continue;
    if (restrictedKeys.has(v)) {
      if (!restricted.includes(v)) restricted.push(v);
    } else if (!words.includes(v)) {
      words.push(v);
    }
  }
  return { restricted, words };
}

/** The list to save: restricted categories in the screen's order, then the words, no repeats. */
export function buildHold(restricted: readonly string[], words: readonly string[]): string[] {
  const out = RESTRICTED_HOLD_CATEGORIES.map((c) => c.key).filter((k) => restricted.includes(k));
  for (const w of words) {
    const v = normalizeHoldWord(w);
    if (v && !out.includes(v)) out.push(v);
  }
  return out;
}

/**
 * Adds a word or phrase, or says why not. A word that names a restricted category ticks that
 * category instead of adding a duplicate word.
 */
export function addHoldWord(
  restricted: readonly string[],
  words: readonly string[],
  input: string,
): { restricted: string[]; words: string[]; error?: string } {
  const v = normalizeHoldWord(input);
  const same = { restricted: [...restricted], words: [...words] };
  if (!v) return { ...same, error: "Type a word or phrase first." };
  if (v.length > MAX_HOLD_LENGTH) return { ...same, error: `Keep it to ${MAX_HOLD_LENGTH} characters.` };
  if (restricted.includes(v) || words.includes(v)) return { ...same, error: "That is already on the list." };
  if (restricted.length + words.length >= MAX_HOLD_ENTRIES) {
    return { ...same, error: `The list holds up to ${MAX_HOLD_ENTRIES} entries.` };
  }
  if (restrictedKeys.has(v)) return { restricted: [...restricted, v], words: [...words] };
  return { restricted: [...restricted], words: [...words, v] };
}

/** Whether the edited list differs from the saved one (order aside). */
export function holdChanged(saved: readonly string[] | undefined, next: readonly string[]): boolean {
  const a = buildHold(splitHold(saved).restricted, splitHold(saved).words);
  if (a.length !== next.length) return true;
  return a.some((v) => !next.includes(v));
}
