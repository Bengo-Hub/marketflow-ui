import { describe, expect, it } from "vitest";
import {
  addClass,
  addTarget,
  classOrder,
  moveTarget,
  parsePolicy,
  removeClass,
  removeTarget,
  serializePolicy,
  updateTarget,
  type RoutingPolicy,
} from "./routing-policy";

const stored = JSON.stringify({
  classes: {
    custom: [{ provider: "groq", model: "" }],
    premium: [
      { provider: "anthropic", model: "@premium", effort: "medium", timeout_seconds: 45 },
      { provider: "groq", model: "" },
    ],
    nano: [{ provider: "groq", model: "@router" }],
  },
  decide: { monthly_usd_ceiling: 20 },
  prices: { groq: { "*": { input_usd_per_m: 0, output_usd_per_m: 0 } } },
});

function parsed(raw = stored): RoutingPolicy {
  const r = parsePolicy(raw);
  if (!r.ok) throw new Error(r.error);
  return r.policy;
}

describe("parsePolicy", () => {
  it("treats empty text as the built-in defaults", () => {
    expect(parsePolicy("  ")).toEqual({ ok: true, policy: {} });
    expect(serializePolicy({})).toBe("");
  });
  it("rejects text that is not a policy object", () => {
    expect(parsePolicy("{nope").ok).toBe(false);
    expect(parsePolicy("[]").ok).toBe(false);
    expect(parsePolicy('{"classes":{"nano":{}}}').ok).toBe(false);
    expect(parsePolicy('{"classes":{"nano":[1]}}').ok).toBe(false);
  });
});

describe("structured edits", () => {
  it("lists known classes in cost order, then the rest", () => {
    expect(classOrder(parsed())).toEqual(["nano", "premium", "custom"]);
  });
  it("keeps decide, prices and the target fields it does not show", () => {
    const p = updateTarget(parsed(), "premium", 0, "model", "claude-sonnet");
    const back = JSON.parse(serializePolicy(p));
    expect(back.decide).toEqual({ monthly_usd_ceiling: 20 });
    expect(back.prices.groq["*"].output_usd_per_m).toBe(0);
    expect(back.classes.premium[0]).toEqual({ provider: "anthropic", model: "claude-sonnet", effort: "medium", timeout_seconds: 45 });
  });
  it("sets and clears a timeout", () => {
    let p = updateTarget(parsed(), "nano", 0, "timeout_seconds", "8");
    expect(p.classes!.nano[0].timeout_seconds).toBe(8);
    p = updateTarget(p, "nano", 0, "timeout_seconds", "");
    expect("timeout_seconds" in p.classes!.nano[0]).toBe(false);
  });
  it("reorders, adds and removes targets and classes", () => {
    let p = moveTarget(parsed(), "premium", 1, -1);
    expect(p.classes!.premium.map((t) => t.provider)).toEqual(["groq", "anthropic"]);
    expect(moveTarget(p, "premium", 0, -1)).toBe(p);
    p = addTarget(p, "premium");
    expect(p.classes!.premium).toHaveLength(3);
    p = removeTarget(p, "premium", 2);
    expect(p.classes!.premium).toHaveLength(2);
    p = addClass(p, "standard");
    expect(classOrder(p)).toEqual(["nano", "standard", "premium", "custom"]);
    p = removeClass(removeClass(removeClass(removeClass(p, "standard"), "premium"), "nano"), "custom");
    expect(JSON.parse(serializePolicy(p)).classes).toBeUndefined();
  });
});
