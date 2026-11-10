import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchProfile } from "./pkce";

function stubMe(me: Record<string, unknown>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("/api/v1/auth/me")) return new Response(JSON.stringify(me), { status: 200 });
      return new Response("{}", { status: 404 }); // public profile enrichment: not needed here
    }),
  );
}

afterEach(() => vi.unstubAllGlobals());

// Platform owner comes only from auth-api's is_platform_owner claim (admin or superuser in the
// platform tenant). Being a member of the codevertex tenant is not enough: a reviewer or staff
// member there was shown the Platform console (2026-11-10).
describe("fetchProfile platform owner", () => {
  it("a plain member of the codevertex tenant is not a platform owner", async () => {
    stubMe({ id: "u1", email: "meta-review@codevertexafrica.com", tenant_slug: "codevertex", roles: ["member"], is_platform_owner: false });
    const p = await fetchProfile("token");
    expect(p.isPlatformOwner).toBe(false);
    expect(p.tenantSlug).toBe("codevertex");
  });

  it("the claim from auth-api makes a platform owner", async () => {
    stubMe({ id: "u2", email: "admin@codevertexafrica.com", tenant_slug: "codevertex", roles: ["superuser"], is_platform_owner: true });
    expect((await fetchProfile("token")).isPlatformOwner).toBe(true);
  });

  it("a missing claim is not a platform owner", async () => {
    stubMe({ id: "u3", email: "x@example.com", tenant_slug: "codevertex", roles: ["admin"] });
    expect((await fetchProfile("token")).isPlatformOwner).toBe(false);
  });
});
