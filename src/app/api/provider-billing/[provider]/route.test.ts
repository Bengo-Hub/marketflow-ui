// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const call = (provider: string) => GET(new Request("https://x/api/provider-billing/" + provider), { params: Promise.resolve({ provider }) });

describe("provider billing redirect", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("forwards to the provider's billing page", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: "https://fal.ai/dashboard/billing" }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await call("fal");
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://fal.ai/dashboard/billing");
    expect(String(fetchMock.mock.calls[0][0])).toContain("/api/v1/public/provider-billing/fal");
  });

  it("falls back to the providers page for an unknown provider, a bad name or a non-https link", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 404 })));
    expect((await call("nobody")).headers.get("location")).toMatch(/\/platform\/providers$/);
    expect((await call("../x")).headers.get("location")).toMatch(/\/platform\/providers$/);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ url: "javascript:alert(1)" }), { status: 200 })));
    expect((await call("fal")).headers.get("location")).toMatch(/\/platform\/providers$/);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("down")));
    expect((await call("fal")).headers.get("location")).toMatch(/\/platform\/providers$/);
  });
});
