import type { Template, TemplateFacets } from "@/lib/api/marketing-os";

/**
 * Filters and sort for the Marketing team > Templates gallery. Every facet comes from the
 * template data (marketflow-ai library template_facets.yaml); these helpers only read it.
 * Filters live in the URL query, so a filtered view can be shared.
 */

export type TemplateSort = "recommended" | "most_used" | "newest" | "az" | "cheapest";
export type TemplateCost = "" | "chat" | "credits";

export interface TemplateFilters {
  q: string;
  specialist: string;
  goal: string;
  language: string;
  channel: string;
  output: string;
  cost: TemplateCost;
  /** Highest credit price to show; null for no limit. */
  maxCredits: number | null;
  /** Inputs a template must ask for (all of them). */
  inputs: string[];
  sort: TemplateSort;
}

export const SORTS: { key: TemplateSort; label: string }[] = [
  { key: "recommended", label: "Recommended" },
  { key: "most_used", label: "Most used" },
  { key: "newest", label: "Newest" },
  { key: "az", label: "A to Z" },
  { key: "cheapest", label: "Cheapest" },
];

export const EMPTY_FILTERS: TemplateFilters = {
  q: "",
  specialist: "",
  goal: "",
  language: "",
  channel: "",
  output: "",
  cost: "",
  maxCredits: null,
  inputs: [],
  sort: "recommended",
};

/** The query keys the gallery owns; anything else in the URL is left alone. */
const KEYS = ["tq", "who", "goal", "lang", "channel", "output", "cost", "max", "needs", "sort"] as const;

const isSort = (s: string | null): s is TemplateSort => SORTS.some((o) => o.key === s);

/** Reads the filters from a URL query; unknown or malformed values fall back to the defaults. */
export function parseFilters(params: URLSearchParams | null | undefined): TemplateFilters {
  if (!params) return { ...EMPTY_FILTERS };
  const max = Number(params.get("max"));
  const cost = params.get("cost");
  const sort = params.get("sort");
  return {
    q: (params.get("tq") ?? "").slice(0, 200),
    specialist: params.get("who") ?? "",
    goal: params.get("goal") ?? "",
    language: params.get("lang") ?? "",
    channel: params.get("channel") ?? "",
    output: params.get("output") ?? "",
    cost: cost === "chat" || cost === "credits" ? cost : "",
    maxCredits: params.get("max") && Number.isFinite(max) && max >= 0 ? Math.floor(max) : null,
    inputs: (params.get("needs") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    sort: isSort(sort) ? sort : "recommended",
  };
}

/**
 * Writes the filters into a copy of the current query: defaults are left out, other keys
 * (tab, brief) are kept. Returns the query string without "?".
 */
export function filtersToQuery(f: TemplateFilters, current?: URLSearchParams | null): string {
  const p = new URLSearchParams(current?.toString() ?? "");
  for (const k of KEYS) p.delete(k);
  const set = (k: string, v: string) => {
    if (v) p.set(k, v);
  };
  set("tq", f.q.trim());
  set("who", f.specialist);
  set("goal", f.goal);
  set("lang", f.language);
  set("channel", f.channel);
  set("output", f.output);
  set("cost", f.cost);
  if (f.maxCredits !== null) p.set("max", String(f.maxCredits));
  set("needs", f.inputs.join(","));
  if (f.sort !== "recommended") p.set("sort", f.sort);
  return p.toString();
}

/** How many filters (not the search or the sort) are set, for the "Clear filters" link. */
export function activeFilterCount(f: TemplateFilters): number {
  return (
    [f.specialist, f.goal, f.language, f.channel, f.output, f.cost].filter(Boolean).length +
    (f.maxCredits !== null ? 1 : 0) +
    f.inputs.length
  );
}

/** Clears every filter and the search; the sort is kept. */
export function clearFilters(f: TemplateFilters): TemplateFilters {
  return { ...EMPTY_FILTERS, sort: f.sort };
}

function matchesText(t: Template, q: string): boolean {
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const hay = `${t.title} ${t.template} ${t.category}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** Whether one template passes the filters (the text search is matched on title, request and category). */
export function matchesFilters(t: Template, f: TemplateFilters): boolean {
  if (f.specialist && t.specialist !== f.specialist) return false;
  if (f.goal && t.goal !== f.goal) return false;
  if (f.language && (t.language ?? "en") !== f.language) return false;
  if (f.channel && !(t.channels ?? []).includes(f.channel)) return false;
  if (f.output && t.output !== f.output) return false;
  if (f.cost === "chat" && t.credits != null) return false;
  if (f.cost === "credits" && t.credits == null) return false;
  if (f.maxCredits !== null && (t.credits ?? 0) > f.maxCredits) return false;
  if (f.inputs.length && !f.inputs.every((i) => (t.inputs ?? []).includes(i))) return false;
  return matchesText(t, f.q);
}

/** Times each template was used from this browser, by id. */
export type Usage = Record<string, number>;

const byRank = (a: Template, b: Template) => (a.rank ?? 0) - (b.rank ?? 0);

/** Sorts a copy of the list; ties keep the library's recommended order. */
export function sortTemplates(list: Template[], sort: TemplateSort, usage: Usage = {}): Template[] {
  const out = [...list];
  switch (sort) {
    case "most_used":
      return out.sort((a, b) => (usage[b.id] ?? 0) - (usage[a.id] ?? 0) || byRank(a, b));
    case "newest":
      return out.sort((a, b) => (b.added ?? "").localeCompare(a.added ?? "") || byRank(a, b));
    case "az":
      return out.sort((a, b) => a.title.localeCompare(b.title, undefined, { sensitivity: "base" }) || byRank(a, b));
    case "cheapest":
      return out.sort((a, b) => (a.credits ?? 0) - (b.credits ?? 0) || byRank(a, b));
    default:
      return out.sort(byRank);
  }
}

/** The filtered, sorted gallery. */
export function applyFilters(list: Template[], f: TemplateFilters, usage: Usage = {}): Template[] {
  return sortTemplates(
    list.filter((t) => matchesFilters(t, f)),
    f.sort,
    usage,
  );
}

export interface FacetChoice {
  key: string;
  label: string;
}

/**
 * The options a facet offers: only values some template in the list carries, in the order
 * and with the labels the data gives. A value with no label in the data is shown as is.
 */
export function facetChoices(
  list: Template[],
  options: { key: string; label: string }[] | undefined,
  pick: (t: Template) => string | string[] | undefined,
): FacetChoice[] {
  const present = new Set<string>();
  for (const t of list) {
    const v = pick(t);
    for (const k of Array.isArray(v) ? v : v ? [v] : []) present.add(k);
  }
  const out: FacetChoice[] = [];
  for (const o of options ?? []) {
    if (present.has(o.key)) {
      out.push({ key: o.key, label: o.label });
      present.delete(o.key);
    }
  }
  Array.from(present).forEach((k) => out.push({ key: k, label: k }));
  return out;
}

/** The highest credit price in the list, for the max-credits field; null when none is priced. */
export function maxCreditPrice(list: Template[]): number | null {
  const prices = list.map((t) => t.credits).filter((c): c is number => typeof c === "number");
  return prices.length ? Math.max(...prices) : null;
}

/** A facet's label, or the key itself when the data has none. */
export function labelFor(options: TemplateFacets[keyof TemplateFacets] | undefined, key: string): string {
  return options?.find((o) => o.key === key)?.label ?? key;
}

const USAGE_KEY = "mf.templates.usage";

/** This browser's template use counts; empty when storage is unavailable. */
export function readUsage(storage: Pick<Storage, "getItem"> | null | undefined): Usage {
  try {
    const raw = storage?.getItem(USAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as Usage) : {};
  } catch {
    return {};
  }
}

/** Counts one use of a template in this browser; storage errors are ignored. */
export function recordUse(storage: Pick<Storage, "getItem" | "setItem"> | null | undefined, id: string): Usage {
  const usage = readUsage(storage);
  usage[id] = (usage[id] ?? 0) + 1;
  try {
    storage?.setItem(USAGE_KEY, JSON.stringify(usage));
  } catch {
    // Private windows and blocked storage: the count only lives for this page.
  }
  return usage;
}
