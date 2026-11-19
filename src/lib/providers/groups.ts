import type { ProviderDef } from "./catalog";

/** A set of providers that do the same job, with its one default (GET /admin/providers/defaults). */
export interface ProviderGroup {
  id: string;
  label: string;
  members: string[];
  default: string;
}

export interface ProviderSection {
  id: string;
  /** Empty for the providers no group lists. */
  label: string;
  defaultName?: string;
  providers: ProviderDef[];
}

/**
 * Splits a tab's providers into one section per group, in the groups' order. A provider listed
 * by several groups (fal does image, video and voice) sits in the first of them and shows a
 * default control for each on its card. Providers no group lists come last, without a heading.
 */
export function sectionsFor(providers: ProviderDef[], groups: ProviderGroup[]): ProviderSection[] {
  const byId = new Map(providers.map((p) => [p.id, p]));
  const placed = new Set<string>();
  const out: ProviderSection[] = [];
  for (const g of groups) {
    const members = g.members.filter((m) => byId.has(m) && !placed.has(m)).map((m) => byId.get(m)!);
    if (members.length === 0) continue;
    members.forEach((p) => placed.add(p.id));
    const def = byId.get(g.default);
    out.push({ id: g.id, label: g.label, defaultName: g.members.length > 1 ? def?.name : undefined, providers: members });
  }
  const rest = providers.filter((p) => !placed.has(p.id));
  if (rest.length > 0) out.push({ id: "other", label: out.length > 0 ? "Other" : "", providers: rest });
  return out;
}
