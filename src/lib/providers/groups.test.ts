import { describe, expect, it } from "vitest";
import { findProvider, providerCatalog } from "./catalog";
import { isAdvancedField, isWideCard, sectionsFor, type ProviderGroup } from "./groups";
import { emptyReason } from "../api/endpoints";

const media = providerCatalog.find((c) => c.id === "media")!.providers;
const ai = providerCatalog.find((c) => c.id === "ai")!.providers;
const groups: ProviderGroup[] = [
  { id: "web_search", label: "Web search", members: ["tavily", "vertex_search"], default: "tavily" },
  { id: "image", label: "Image generation", members: ["fal", "higgsfield"], default: "fal" },
  { id: "video", label: "Video generation", members: ["higgsfield", "fal"], default: "higgsfield" },
  { id: "voice", label: "Voice", members: ["elevenlabs", "fal"], default: "elevenlabs" },
];

// The backend's groups (marketflow-api internal/modules/admin/provider_defaults.go).
const apiGroups: ProviderGroup[] = [
  ...groups.slice(0, 1),
  { id: "llm", label: "Language models", members: ["groq", "anthropic", "openai"], default: "groq" },
  { id: "embeddings", label: "Embeddings and local model", members: ["ollama"], default: "ollama" },
  { id: "decisions", label: "Typed decisions", members: ["typesafe"], default: "typesafe" },
];

describe("sectionsFor", () => {
  it("puts each provider once, under the first group that lists it", () => {
    const s = sectionsFor(media, groups);
    expect(s.map((x) => x.id)).toEqual(["image", "voice", "section:Routing and quality checks", "other"]);
    expect(s[0].providers.map((p) => p.id)).toEqual(["fal", "higgsfield"]);
    expect(s[0].defaultName).toBe("fal.ai");
    // The routing and self-review settings cards get their own heading after the groups.
    expect(s[2].providers.map((p) => p.id)).toEqual(["routing", "review"]);
    expect(s[3].providers.map((p) => p.id)).toEqual(["creatomate"]);
  });
  it("puts the free-tier models right under language models and routing after the groups", () => {
    const s = sectionsFor(ai, apiGroups);
    expect(s.map((x) => x.label)).toEqual([
      "Web search",
      "Language models",
      "Free-tier fallbacks",
      "Embeddings and local model",
      "Typed decisions",
      "Routing and pricing",
    ]);
    expect(s[2].parentLabel).toBe("Language models");
    expect(s[2].providers.map((p) => p.id)).toEqual(["openrouter", "gemini", "cerebras"]);
    expect(s[5].providers.map((p) => p.id)).toEqual(["policy", "outputs"]);
  });
  it("still shows every provider before the groups load", () => {
    const s = sectionsFor(ai, []);
    expect(s.flatMap((x) => x.providers)).toHaveLength(ai.length);
    expect(s.at(-1)!.label).toBe("Other");
    expect(s.find((x) => x.label === "Free-tier fallbacks")?.parentLabel).toBeUndefined();
  });
});

describe("card layout", () => {
  it("hides endpoints behind Advanced but never a required field", () => {
    const groq = findProvider("ai_llm", "groq")!;
    expect(groq.fields.filter(isAdvancedField).map((f) => f.key)).toEqual(["base_url", "billing_url"]);
    expect(isAdvancedField({ key: "base_url", label: "Base URL", type: "url", required: true })).toBe(false);
  });
  it("gives every paid platform provider a billing page field, and config-only cards none", () => {
    for (const [type, id] of [["ai_llm", "openai"], ["ai_llm", "anthropic"], ["media", "fal"], ["media", "higgsfield"], ["media", "elevenlabs"]]) {
      expect(findProvider(type, id)!.fields.filter((f) => f.key === "billing_url")).toHaveLength(1);
    }
    expect(findProvider("ai_routing", "policy")!.fields.some((f) => f.key === "billing_url")).toBe(false);
  });
  it("gives JSON and long settings cards the full row", () => {
    expect(isWideCard(findProvider("ai_routing", "policy")!)).toBe(true);
    expect(isWideCard(findProvider("ai_search", "vertex_search")!)).toBe(true);
    expect(isWideCard(findProvider("media", "review")!)).toBe(true);
    expect(isWideCard(findProvider("ai_llm", "groq")!)).toBe(false);
    expect(isWideCard(findProvider("ai_llm", "openrouter")!)).toBe(false);
  });
});

describe("catalog", () => {
  it("has retired Google Custom Search and offers Vertex AI Search", () => {
    expect(findProvider("ai_search", "custom_search")).toBeUndefined();
    expect(findProvider("ai_search", "vertex_search")?.fields.map((f) => f.key)).toContain("engine_id");
  });
  it("gives every model provider a sync and a test, and keeps model ids out of defaults", () => {
    for (const id of ["groq", "openai", "anthropic", "openrouter", "gemini", "cerebras"]) {
      const p = findProvider("ai_llm", id)!;
      expect(p.capabilities?.syncModels && p.capabilities?.test).toBe(true);
      for (const f of p.fields) if (/model$/.test(f.key)) expect(f.default).toBeUndefined();
    }
    expect(findProvider("media", "elevenlabs")?.capabilities?.syncModels).toBe(true);
    expect(findProvider("media", "fal")?.capabilities?.balance).toBe(true);
    expect(findProvider("decide", "typesafe")?.capabilities?.test).toBe(true);
  });
});

describe("emptyReason", () => {
  it("explains an empty service from its last scan", () => {
    expect(emptyReason({ service: "x", endpoints: [] })).toMatch(/not been scanned/);
    expect(emptyReason({ service: "x", endpoints: [], last_scan: { scanned_at: "", operations: 4, offerable: 0, added: 0, docs_view: "external" } })).toMatch(
      /public spec/,
    );
    expect(emptyReason({ service: "x", endpoints: [], last_scan: { scanned_at: "", operations: 0, offerable: 0, added: 0, error: "status 404" } })).toMatch(/404/);
  });
});

describe("settings cards", () => {
  it("makes the per-video ceiling editable and the posting switches on or off", () => {
    const ceiling = findProvider("media", "routing")!.fields.find((f) => f.key === "max_video_budget_usd")!;
    expect(ceiling.type).toBe("number");
    expect(ceiling.default).toBe("2");
    const sw = findProvider("publishing", "switches")!.fields.map((f) => f.key);
    expect(sw).toContain("facebook_enabled");
    expect(findProvider("media", "review")!.fields.map((f) => f.key)).toContain("max_retries");
  });
});
