import { afterEach, describe, expect, it, vi } from "vitest";
import {
  clearResolvedHosts,
  domainAllows,
  isTenantDomain,
  normaliseHost,
  resolveTenantHost,
  tenantRewritePath,
} from "./tenant-domains";

const APP = "marketflow.codevertexafrica.com";

describe("tenant domains", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    clearResolvedHosts();
  });

  it("tells a tenant's domain from the app's own host", () => {
    expect(normaliseHost("Shop.Example.co.ke:443")).toBe("shop.example.co.ke");
    expect(isTenantDomain("shop.example.co.ke", APP)).toBe(true);
    expect(isTenantDomain("marketflow.codevertexafrica.com:443", APP)).toBe(false);
    expect(isTenantDomain("localhost:3000", APP)).toBe(false);
    expect(isTenantDomain("", APP)).toBe(false);
  });

  it("serves the public page at the root and leaves other paths alone", () => {
    expect(tenantRewritePath("/", "acme")).toBe("/p/acme");
    expect(tenantRewritePath("/book", "acme")).toBe("/book/acme");
    expect(tenantRewritePath("/f/spring-offer", "acme")).toBeNull();
    expect(tenantRewritePath("/s/abc123", "acme")).toBeNull();
    expect(tenantRewritePath("/_next/static/x.js", "acme")).toBeNull();
    expect(tenantRewritePath("/logo.png", "acme")).toBeNull();
  });

  it("shows only the domain's own tenant on a tenant domain", () => {
    expect(domainAllows(null, "acme")).toBe(true);
    expect(domainAllows("acme", "acme")).toBe(true);
    expect(domainAllows("acme", "other")).toBe(false);
  });

  it("accepts only MarketFlow domains from auth-api, and caches misses", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = String(input);
      if (url.includes("host=shop.example.co.ke")) {
        return new Response(JSON.stringify({ tenant_slug: "acme", service: "marketflow", status: "active" }));
      }
      if (url.includes("host=store.example.com")) {
        return new Response(JSON.stringify({ tenant_slug: "acme", service: "ordering", status: "active" }));
      }
      return new Response("{}", { status: 404 });
    });
    expect(await resolveTenantHost("shop.example.co.ke", "https://sso.example/")).toBe("acme");
    expect(await resolveTenantHost("store.example.com", "https://sso.example")).toBeUndefined();
    expect(await resolveTenantHost("unknown.example", "https://sso.example")).toBeUndefined();
    expect(await resolveTenantHost("unknown.example", "https://sso.example")).toBeUndefined();
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
