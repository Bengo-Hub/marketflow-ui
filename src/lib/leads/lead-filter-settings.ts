/**
 * Item 61: the words that mark a form submission as not a lead (someone asking for attachment or
 * a job, or a business pitching its own services). The platform lists come from marketflow-api
 * (MF_LEAD_FILTER_*) and are read only here; the tenant adds its own words in
 * metadata.lead_filter, which marketflow-api checks on top of the platform lists.
 */

export type LeadFilterKind = "attachment" | "job" | "service_offer";

export type LeadFilterWords = Record<LeadFilterKind, string[]>;

/** GET /api/v1/tenant/profile/lead-filter. */
export interface LeadFilterResponse {
  platform: LeadFilterWords;
  tenant: LeadFilterWords;
  /** Owners and admins change the words; everyone else sees them. */
  can_edit: boolean;
}

export const LEAD_FILTER_KINDS: { kind: LeadFilterKind; title: string; hint: string; example: string }[] = [
  {
    kind: "attachment",
    title: "Attachment and internship requests",
    hint: "Students asking for an attachment or internship place.",
    example: "industrial placement",
  },
  { kind: "job", title: "Job seekers", hint: "People asking for a job or sending a CV.", example: "graduate trainee" },
  {
    kind: "service_offer",
    title: "Businesses selling to you",
    hint: "Agencies and suppliers pitching their own services.",
    example: "we build websites",
  },
];

/** The API's limits (marketflow-api tenant.ValidateLeadFilterSetting). */
export const MAX_LEAD_FILTER_WORDS = 50;
export const MAX_LEAD_FILTER_WORD_LENGTH = 80;

export function emptyLeadFilterWords(): LeadFilterWords {
  return { attachment: [], job: [], service_offer: [] };
}

/**
 * Reads a text box of words: one per line or comma separated, trimmed, lower case, without
 * repeats, in the order typed.
 */
export function parseLeadFilterWords(text: string): string[] {
  const out: string[] = [];
  for (const raw of text.split(/[\n,]/)) {
    const w = raw.trim().replace(/\s+/g, " ").toLowerCase();
    if (w && !out.includes(w)) out.push(w);
  }
  return out;
}

/** The words as the text box shows them, one per line. */
export function leadFilterText(words: string[] | undefined): string {
  return (words ?? []).join("\n");
}

/** What stops a save: too many words in a list, or a word that is too long. */
export function leadFilterProblems(words: LeadFilterWords): string[] {
  const out: string[] = [];
  for (const { kind, title } of LEAD_FILTER_KINDS) {
    const list = words[kind] ?? [];
    if (list.length > MAX_LEAD_FILTER_WORDS) out.push(`${title}: at most ${MAX_LEAD_FILTER_WORDS} words.`);
    const long = list.find((w) => w.length > MAX_LEAD_FILTER_WORD_LENGTH);
    if (long) out.push(`${title}: "${long.slice(0, 30)}..." is longer than ${MAX_LEAD_FILTER_WORD_LENGTH} characters.`);
  }
  return out;
}

/** The metadata.lead_filter a save sends: the non-empty lists, or null to clear them all. */
export function leadFilterPatch(words: LeadFilterWords): Partial<LeadFilterWords> | null {
  const out: Partial<LeadFilterWords> = {};
  for (const { kind } of LEAD_FILTER_KINDS) {
    if (words[kind]?.length) out[kind] = words[kind];
  }
  return Object.keys(out).length ? out : null;
}

/** The tenant's words that the platform list already has, which add nothing. */
export function wordsAlreadyCovered(tenant: string[], platform: string[]): string[] {
  const p = new Set(platform.map((w) => w.trim().toLowerCase()));
  return tenant.filter((w) => p.has(w));
}
