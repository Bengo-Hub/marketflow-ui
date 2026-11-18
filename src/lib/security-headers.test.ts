import { describe, expect, it } from "vitest";
import { ENFORCED_CSP, securityHeaders, type HeaderRule } from "./security-headers";

function header(rule: HeaderRule, key: string): string | undefined {
  return rule.headers.find((h) => h.key === key)?.value;
}

/** Next matches `source` with path-to-regexp; this covers the two patterns used here. */
function matches(source: string, path: string): boolean {
  if (source.endsWith("/:path*")) {
    const base = source.slice(0, -"/:path*".length);
    return path === base || path.startsWith(`${base}/`);
  }
  return new RegExp(`^${source}$`).test(path);
}

const env = {
  NEXT_PUBLIC_API_URL: "https://api.test.example/",
  NEXT_PUBLIC_AI_API_URL: "https://ai.test.example",
  NEXT_PUBLIC_AUTH_API_URL: "https://sso.test.example",
};

describe("security headers", () => {
  const rules = securityHeaders(env);
  const generic = rules.find((r) => matches(r.source, "/acme/dashboard"))!;
  const widget = rules.find((r) => matches(r.source, "/widget/chat.js"))!;

  it("blocks framing by other sites and sets the basic headers on app routes", () => {
    expect(header(generic, "X-Frame-Options")).toBe("SAMEORIGIN");
    expect(header(generic, "Content-Security-Policy")).toContain("frame-ancestors 'self'");
    expect(header(generic, "X-Content-Type-Options")).toBe("nosniff");
    expect(header(generic, "Referrer-Policy")).toBe("strict-origin-when-cross-origin");
    expect(header(generic, "Permissions-Policy")).toContain("camera=()");
  });

  it("covers the root and the public pages with the generic rule", () => {
    for (const path of ["/", "/p/acme", "/f/acme", "/book/acme"]) {
      expect(matches(generic.source, path)).toBe(true);
    }
  });

  it("leaves the widget out of the generic rule and lets other sites load it", () => {
    expect(matches(generic.source, "/widget/chat.js")).toBe(false);
    expect(widget).not.toBe(generic);
    expect(header(widget, "Cross-Origin-Resource-Policy")).toBe("cross-origin");
    expect(header(widget, "X-Content-Type-Options")).toBe("nosniff");
    expect(header(widget, "X-Frame-Options")).toBeUndefined();
    expect(header(widget, "Content-Security-Policy")).toBeUndefined();
  });

  it("allows the configured API, AI and SSO origins in the report-only policy", () => {
    const csp = header(generic, "Content-Security-Policy-Report-Only")!;
    const connect = csp.split("; ").find((d) => d.startsWith("connect-src "))!;
    expect(connect).toContain("https://api.test.example");
    expect(connect).not.toContain("https://api.test.example/");
    expect(connect).toContain("https://ai.test.example");
    expect(connect).toContain("https://sso.test.example");
    expect(csp).toContain("object-src 'none'");
  });

  it("falls back to the production hosts when nothing is configured", () => {
    const csp = header(securityHeaders({})[0], "Content-Security-Policy-Report-Only")!;
    expect(csp).toContain("https://marketflowapi.codevertexafrica.com");
    expect(csp).toContain("https://sso.codevertexafrica.com");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("enforces only the safe directives", () => {
    expect(ENFORCED_CSP).toContain("object-src 'none'");
    expect(header(generic, "Content-Security-Policy")).toBe(ENFORCED_CSP);
  });
});
