import type { ProviderDef, ProviderField } from "./catalog";

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
  /** Set on a sub-group: the label of the group section it follows ("Language models"). */
  parentLabel?: string;
  defaultName?: string;
  providers: ProviderDef[];
}

/**
 * Splits a tab's providers into one section per group, in the groups' order. A provider listed
 * by several groups (fal does image, video and voice) sits in the first of them and shows a
 * default control for each on its card. Providers no group lists go under their catalog
 * `section` heading (a sub-group right after the group it names in `after`, otherwise after every
 * group); the rest come last, as "Other" or without a heading when nothing else is grouped.
 */
export function sectionsFor(providers: ProviderDef[], groups: ProviderGroup[]): ProviderSection[] {
  const byId = new Map(providers.map((p) => [p.id, p]));
  const placed = new Set<string>();
  const out: (ProviderSection & { groupId?: string })[] = [];
  for (const g of groups) {
    const members = g.members.filter((m) => byId.has(m) && !placed.has(m)).map((m) => byId.get(m)!);
    if (members.length === 0) continue;
    members.forEach((p) => placed.add(p.id));
    const def = byId.get(g.default);
    out.push({ id: g.id, groupId: g.id, label: g.label, defaultName: g.members.length > 1 ? def?.name : undefined, providers: members });
  }

  const named = new Map<string, ProviderSection & { after?: string }>();
  for (const p of providers) {
    if (placed.has(p.id) || !p.section) continue;
    placed.add(p.id);
    const key = p.section.label;
    const s = named.get(key) ?? { id: `section:${key}`, label: key, after: p.section.after, providers: [] };
    s.providers.push(p);
    named.set(key, s);
  }
  const trailing: ProviderSection[] = [];
  for (const { after, ...s } of named.values()) {
    const at = after ? out.findIndex((x) => x.groupId === after) : -1;
    if (at < 0) {
      trailing.push(s);
      continue;
    }
    let pos = at + 1;
    while (out[pos]?.parentLabel === out[at].label) pos++;
    out.splice(pos, 0, { ...s, parentLabel: out[at].label });
  }
  out.push(...trailing);

  const rest = providers.filter((p) => !placed.has(p.id));
  if (rest.length > 0) out.push({ id: "other", label: out.length > 0 ? "Other" : "", providers: rest });
  return out.map((s) => ({ id: s.id, label: s.label, parentLabel: s.parentLabel, defaultName: s.defaultName, providers: s.providers }));
}

const ADVANCED_KEYS = new Set(["base_url", "redirect_url", "scopes", "graph_version"]);

/**
 * Fields kept behind the card's "Advanced settings" disclosure: endpoints, redirect URLs and
 * permission lists that ship with a working default. A required field is never hidden.
 */
export function isAdvancedField(f: ProviderField): boolean {
  if (f.required) return false;
  return f.advanced ?? ADVANCED_KEYS.has(f.key);
}

/** Cards with a JSON or long-text field, or many settings, take the full row. */
export function isWideCard(p: ProviderDef): boolean {
  return p.fields.some((f) => f.type === "textarea") || p.fields.filter((f) => !isAdvancedField(f)).length > 4;
}
