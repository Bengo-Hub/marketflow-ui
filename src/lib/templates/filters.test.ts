import { describe, expect, it } from "vitest";
import type { Template } from "@/lib/api/marketing-os";
import {
  EMPTY_FILTERS,
  activeFilterCount,
  applyFilters,
  clearFilters,
  facetChoices,
  filtersToQuery,
  labelFor,
  matchesFilters,
  maxCreditPrice,
  parseFilters,
  readUsage,
  recordUse,
  sortTemplates,
  type TemplateFilters,
} from "./filters";

const tpl = (over: Partial<Template> & Pick<Template, "id" | "title">): Template => ({
  template: "",
  category: "",
  source: "marketflow",
  ...over,
});

const ads = tpl({
  id: "ad-creative:0", title: "Ads for my product this week", template: "Write ads for ${offering} on ${platforms}",
  specialist: "ads_specialist", goal: "ads", output: "copy", language: "en", inputs: ["offering", "platforms", "budget"],
  added: "2026-10-22", tier: "poster", credits: 2, rank: 1,
});
const tangazo = tpl({
  id: "ad-creative:1", title: "Tangazo la wiki hii", template: "Nataka matangazo ya ${offering}",
  specialist: "ads_specialist", goal: "ads", output: "copy", language: "sw", inputs: ["offering", "budget"],
  added: "2026-10-22", tier: "poster", credits: 2, rank: 2,
});
const ugc = tpl({
  id: "ugc-video:1", title: "Video ya mtu akionyesha bidhaa", template: "Nataka video kama za TikTok",
  specialist: "content_creator", goal: "ads", output: "video", language: "sw", channels: ["tiktok"],
  inputs: ["offering", "budget"], added: "2026-11-14", tier: "presenter_30s", credits: 22, rank: 3,
});
const broadcast = tpl({
  id: "whatsapp-sms:0", title: "WhatsApp broadcast", template: "Write a WhatsApp broadcast about ${offering}",
  specialist: "content_creator", goal: "content", output: "copy", language: "en", channels: ["whatsapp"],
  inputs: ["offering", "goal"], added: "2026-10-22", rank: 4,
});
const prompt = tpl({ id: "prompt:9", title: "Act as a sales coach", source: "prompts.chat", category: "sales", rank: 5 });
const all = [ads, tangazo, ugc, broadcast, prompt];
const f = (over: Partial<TemplateFilters>): TemplateFilters => ({ ...EMPTY_FILTERS, ...over });
const ids = (list: Template[]) => list.map((t) => t.id);

describe("template filters", () => {
  it("round-trips through the URL and keeps other keys", () => {
    const filters = f({ q: "tiktok ads", goal: "ads", language: "sw", cost: "credits", maxCredits: 30, inputs: ["offering", "budget"], sort: "cheapest" });
    const query = filtersToQuery(filters, new URLSearchParams("tab=templates&brief=hello"));
    const back = new URLSearchParams(query);
    expect(back.get("tab")).toBe("templates");
    expect(back.get("brief")).toBe("hello");
    expect(parseFilters(back)).toEqual(filters);
    expect(filtersToQuery(EMPTY_FILTERS, new URLSearchParams("tab=ask&goal=ads"))).toBe("tab=ask");
  });

  it("ignores malformed query values", () => {
    const p = parseFilters(new URLSearchParams("sort=random&cost=free&max=-3&needs=,offering,"));
    expect(p.sort).toBe("recommended");
    expect(p.cost).toBe("");
    expect(p.maxCredits).toBeNull();
    expect(p.inputs).toEqual(["offering"]);
    expect(parseFilters(null)).toEqual(EMPTY_FILTERS);
  });

  it("filters on each essential facet", () => {
    expect(ids(applyFilters(all, f({ specialist: "content_creator" })))).toEqual([ugc.id, broadcast.id]);
    expect(ids(applyFilters(all, f({ goal: "ads" })))).toEqual([ads.id, tangazo.id, ugc.id]);
    expect(ids(applyFilters(all, f({ language: "sw" })))).toEqual([tangazo.id, ugc.id]);
    expect(ids(applyFilters(all, f({ channel: "whatsapp" })))).toEqual([broadcast.id]);
  });

  it("filters on output, cost, price and required inputs", () => {
    expect(ids(applyFilters(all, f({ output: "video" })))).toEqual([ugc.id]);
    expect(ids(applyFilters(all, f({ cost: "chat" })))).toEqual([broadcast.id, prompt.id]);
    expect(ids(applyFilters(all, f({ cost: "credits", maxCredits: 5 })))).toEqual([ads.id, tangazo.id]);
    expect(ids(applyFilters(all, f({ inputs: ["offering", "platforms"] })))).toEqual([ads.id]);
    expect(ids(applyFilters(all, f({ goal: "ads", output: "poster" })))).toEqual([]);
  });

  it("matches every search word on title, request or category", () => {
    expect(matchesFilters(broadcast, f({ q: "whatsapp broadcast" }))).toBe(true);
    expect(matchesFilters(broadcast, f({ q: "whatsapp poster" }))).toBe(false);
    expect(matchesFilters(prompt, f({ q: "SALES" }))).toBe(true);
  });

  it("sorts, keeping the recommended order on ties", () => {
    expect(ids(sortTemplates(all, "recommended"))).toEqual(ids(all));
    expect(ids(sortTemplates(all, "newest"))[0]).toBe(ugc.id);
    expect(ids(sortTemplates(all, "az"))).toEqual([prompt.id, ads.id, tangazo.id, ugc.id, broadcast.id]);
    expect(ids(sortTemplates(all, "cheapest"))).toEqual([broadcast.id, prompt.id, ads.id, tangazo.id, ugc.id]);
    expect(ids(sortTemplates(all, "most_used", { [broadcast.id]: 3, [ugc.id]: 1 }))).toEqual([broadcast.id, ugc.id, ads.id, tangazo.id, prompt.id]);
    expect(ids(sortTemplates(all, "most_used"))).toEqual(ids(all));
  });

  it("counts and clears filters, keeping the sort", () => {
    const filters = f({ q: "x", goal: "ads", maxCredits: 0, inputs: ["offering", "budget"], sort: "az" });
    expect(activeFilterCount(filters)).toBe(4);
    expect(clearFilters(filters)).toEqual({ ...EMPTY_FILTERS, sort: "az" });
  });

  it("offers only facet values the templates carry, in the data's order and labels", () => {
    const languages = [{ key: "en", label: "English" }, { key: "sw", label: "Swahili" }, { key: "fr", label: "French" }];
    expect(facetChoices(all, languages, (t) => t.language)).toEqual([
      { key: "en", label: "English" },
      { key: "sw", label: "Swahili" },
    ]);
    expect(facetChoices(all, [{ key: "tiktok", label: "TikTok" }], (t) => t.channels)).toEqual([
      { key: "tiktok", label: "TikTok" },
      { key: "whatsapp", label: "whatsapp" },
    ]);
    expect(labelFor([{ key: "ads", label: "Ads" }], "ads")).toBe("Ads");
    expect(labelFor(undefined, "ads")).toBe("ads");
    expect(maxCreditPrice(all)).toBe(22);
    expect(maxCreditPrice([broadcast])).toBeNull();
  });

  it("counts uses in storage and survives broken storage", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    recordUse(storage, "a");
    expect(recordUse(storage, "a")).toEqual({ a: 2 });
    expect(readUsage(storage)).toEqual({ a: 2 });
    const broken = { getItem: () => "{not json", setItem: () => { throw new Error("blocked"); } };
    expect(readUsage(broken)).toEqual({});
    expect(recordUse(broken, "b")).toEqual({ b: 1 });
    expect(readUsage(null)).toEqual({});
  });
});
