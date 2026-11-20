import { describe, expect, it } from "vitest";
import { findProvider, providerCatalog } from "./catalog";
import { sectionsFor, type ProviderGroup } from "./groups";
import { emptyReason } from "../api/endpoints";

const media = providerCatalog.find((c) => c.id === "media")!.providers;
const ai = providerCatalog.find((c) => c.id === "ai")!.providers;
const groups: ProviderGroup[] = [
  { id: "web_search", label: "Web search", members: ["tavily", "vertex_search"], default: "tavily" },
  { id: "image", label: "Image generation", members: ["fal", "higgsfield"], default: "fal" },
  { id: "video", label: "Video generation", members: ["higgsfield", "fal"], default: "higgsfield" },
  { id: "voice", label: "Voice", members: ["elevenlabs", "fal"], default: "elevenlabs" },
];

describe("sectionsFor", () => {
  it("puts each provider once, under the first group that lists it", () => {
    const s = sectionsFor(media, groups);
    expect(s.map((x) => x.id)).toEqual(["image", "voice", "other"]);
    expect(s[0].providers.map((p) => p.id)).toEqual(["fal", "higgsfield"]);
    expect(s[0].defaultName).toBe("fal.ai");
    // The routing and self-review settings cards sit with the ungrouped media providers.
    expect(s[2].providers.map((p) => p.id)).toEqual(["routing", "review", "creatomate"]);
  });
  it("groups web search and leaves the rest unheaded when no group fits", () => {
    const s = sectionsFor(ai, groups);
    expect(s[0].providers.map((p) => p.id)).toEqual(["tavily", "vertex_search"]);
    expect(sectionsFor(ai, [])[0].label).toBe("");
  });
});

describe("catalog", () => {
  it("has retired Google Custom Search and offers Vertex AI Search", () => {
    expect(findProvider("ai_search", "custom_search")).toBeUndefined();
    expect(findProvider("ai_search", "vertex_search")?.fields.map((f) => f.key)).toContain("engine_id");
  });
  it("gives every model provider a sync and a test, and keeps model ids out of defaults", () => {
    for (const id of ["groq", "openai", "anthropic"]) {
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
