import { describe, expect, it, vi } from "vitest";

const redirect = vi.fn((url: string) => {
  throw new Error(`NEXT_REDIRECT ${url}`);
});
vi.mock("next/navigation", () => ({ redirect: (url: string) => redirect(url) }));

import TenantHome from "./page";

describe("bare /{tenantSlug}", () => {
  it("opens the tenant's dashboard", async () => {
    await expect(TenantHome({ params: Promise.resolve({ orgSlug: "hadia" }) })).rejects.toThrow("NEXT_REDIRECT /hadia/dashboard");
    expect(redirect).toHaveBeenCalledWith("/hadia/dashboard");
  });

  it("encodes a slug so it cannot change the path", async () => {
    await expect(TenantHome({ params: Promise.resolve({ orgSlug: "a/../b" }) })).rejects.toThrow();
    expect(redirect).toHaveBeenLastCalledWith("/a%2F..%2Fb/dashboard");
  });
});
