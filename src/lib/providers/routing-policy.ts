// Helpers for the model routing policy card (ai_routing/policy, key "policy"). The stored value
// stays the JSON marketflow-ai parses (internal/llm/policy.go): {"classes": {class: [target]},
// "decide": {...}, "prices": {...}}. The structured editor only touches "classes"; every other
// key, and every target field it does not show (effort, temperature, prices), is kept as is.

/** The classes marketflow-ai knows, cheapest first. */
export const POLICY_CLASSES = ["nano", "standard", "premium", "premium_plus"] as const;

export const CLASS_HINT: Record<string, string> = {
  nano: "Light jobs: widget answers, summaries, triage",
  standard: "Chat, simple drafts and tool use",
  premium: "Multi-step plans and copy meant to go live",
  premium_plus: "Marketing plans, strategy and brand context",
};

export interface PolicyTarget {
  provider: string;
  model: string;
  timeout_seconds?: number;
  [key: string]: unknown;
}

export interface RoutingPolicy {
  classes?: Record<string, PolicyTarget[]>;
  [key: string]: unknown;
}

export type ParsedPolicy = { ok: true; policy: RoutingPolicy } | { ok: false; error: string };

/** Parses the stored text. Empty text is a valid empty policy (marketflow-ai uses its defaults). */
export function parsePolicy(raw: string): ParsedPolicy {
  if (raw.trim() === "") return { ok: true, policy: {} };
  let v: unknown;
  try {
    v = JSON.parse(raw);
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
  if (!v || typeof v !== "object" || Array.isArray(v)) return { ok: false, error: "The policy must be a JSON object." };
  const p = v as RoutingPolicy;
  if (p.classes !== undefined) {
    if (!p.classes || typeof p.classes !== "object" || Array.isArray(p.classes)) {
      return { ok: false, error: '"classes" must be an object of class name to a list of targets.' };
    }
    for (const [name, list] of Object.entries(p.classes)) {
      if (!Array.isArray(list)) return { ok: false, error: `Class "${name}" must be a list of targets.` };
      for (const t of list) {
        if (!t || typeof t !== "object" || Array.isArray(t)) return { ok: false, error: `Class "${name}" has a target that is not an object.` };
      }
    }
  }
  return { ok: true, policy: p };
}

/** Pretty JSON, or "" when nothing is left so marketflow-ai falls back to its defaults. */
export function serializePolicy(p: RoutingPolicy): string {
  const out: RoutingPolicy = { ...p };
  if (out.classes && Object.keys(out.classes).length === 0) delete out.classes;
  if (Object.keys(out).length === 0) return "";
  return JSON.stringify(out, null, 2);
}

/** Class names in display order: the known ones first, then any others as stored. */
export function classOrder(p: RoutingPolicy): string[] {
  const names = Object.keys(p.classes ?? {});
  const known = POLICY_CLASSES.filter((c) => names.includes(c));
  return [...known, ...names.filter((n) => !(POLICY_CLASSES as readonly string[]).includes(n))];
}

function withClass(p: RoutingPolicy, cls: string, list: PolicyTarget[] | undefined): RoutingPolicy {
  const classes = { ...(p.classes ?? {}) };
  if (list === undefined) delete classes[cls];
  else classes[cls] = list;
  return { ...p, classes };
}

export function addClass(p: RoutingPolicy, cls: string): RoutingPolicy {
  if (p.classes?.[cls]) return p;
  return withClass(p, cls, [{ provider: "", model: "" }]);
}

export function removeClass(p: RoutingPolicy, cls: string): RoutingPolicy {
  return withClass(p, cls, undefined);
}

export function addTarget(p: RoutingPolicy, cls: string): RoutingPolicy {
  return withClass(p, cls, [...(p.classes?.[cls] ?? []), { provider: "", model: "" }]);
}

export function removeTarget(p: RoutingPolicy, cls: string, i: number): RoutingPolicy {
  return withClass(p, cls, (p.classes?.[cls] ?? []).filter((_, j) => j !== i));
}

/** Moves a target one place up (-1) or down (+1); out of range is a no-op. */
export function moveTarget(p: RoutingPolicy, cls: string, i: number, dir: -1 | 1): RoutingPolicy {
  const list = [...(p.classes?.[cls] ?? [])];
  const j = i + dir;
  if (i < 0 || i >= list.length || j < 0 || j >= list.length) return p;
  [list[i], list[j]] = [list[j], list[i]];
  return withClass(p, cls, list);
}

/** Sets provider, model or timeout on one target. An empty timeout removes the key. */
export function updateTarget(
  p: RoutingPolicy,
  cls: string,
  i: number,
  key: "provider" | "model" | "timeout_seconds",
  value: string,
): RoutingPolicy {
  const list = [...(p.classes?.[cls] ?? [])];
  if (!list[i]) return p;
  const t: PolicyTarget = { ...list[i] };
  if (key === "timeout_seconds") {
    const n = Number(value);
    if (value.trim() === "" || !Number.isFinite(n) || n <= 0) delete t.timeout_seconds;
    else t.timeout_seconds = Math.round(n);
  } else {
    t[key] = value;
  }
  list[i] = t;
  return withClass(p, cls, list);
}
