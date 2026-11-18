import { describe, expect, it } from "vitest";
import { AI_API_URL, APP_URL, PRICING_URL } from "@/lib/urls";
import { STEP_META } from "@/lib/api/onboarding";
import { pageUrl, plansHref, whatsappShareHref, widgetSnippet } from "./quick-start";

describe("setup guide quick start", () => {
  it("links to the MarketFlow plans, as Billing's Change plan does", () => {
    expect(plansHref()).toBe(`${PRICING_URL}/plans?service=marketflow`);
  });

  it("builds the widget code for the business, as in the widget README", () => {
    const s = widgetSnippet("mama-mboga", "#0F766E");
    expect(s).toContain(`src="${APP_URL}/widget/chat.js"`);
    expect(s).toContain('data-tenant="mama-mboga"');
    expect(s).toContain(`data-api-url="${AI_API_URL}"`);
    expect(s).toContain('data-primary-color="#0F766E"');
    expect(s.trim().endsWith("async></script>")).toBe(true);
  });

  it("never puts anything but a slug or a hex colour into the code", () => {
    const s = widgetSnippet('x" onload="alert(1)', "red;}");
    expect(s).not.toContain("onload");
    expect(s).toContain('data-tenant="YOUR_TENANT_SLUG"');
    expect(s).toContain('data-primary-color="#9100B0"');
  });

  it("shares the public page on WhatsApp with a short line", () => {
    const url = pageUrl("mama-mboga");
    expect(url).toBe(`${APP_URL}/p/mama-mboga`);
    const href = whatsappShareHref(url, "Mama Mboga");
    expect(href.startsWith("https://wa.me/?text=")).toBe(true);
    expect(decodeURIComponent(href.split("text=")[1])).toBe(`See what Mama Mboga offers: ${url}`);
    expect(decodeURIComponent(whatsappShareHref(url).split("text=")[1])).toBe(url);
  });

  it("has words for every step the API sends", () => {
    for (const key of ["plan", "widget", "share_page"] as const) {
      expect(STEP_META[key].title.length).toBeGreaterThan(0);
      expect(STEP_META[key].blurb.length).toBeGreaterThan(0);
    }
  });
});
