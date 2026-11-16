// Loads the public embeddable widget (public/widget/chat.js) into jsdom and checks that values
// from the embedding page and from answers cannot inject markup, styles or remote images.
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const source = readFileSync(resolve(process.cwd(), "public/widget/chat.js"), "utf8");

function loadWidget(data: Record<string, string>): ShadowRoot {
  const script = document.createElement("script");
  for (const [k, v] of Object.entries(data)) script.setAttribute(`data-${k}`, v);
  document.body.appendChild(script);
  Object.defineProperty(document, "currentScript", { value: script, configurable: true });
  new Function(source)();
  const host = document.getElementById("vera-root");
  if (!host?.shadowRoot) throw new Error("widget did not mount");
  return host.shadowRoot;
}

async function ask(shadow: ShadowRoot, answer: string) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({
      ok: true,
      status: 200,
      headers: new Headers({ "Content-Type": "application/json" }),
      body: null,
      json: async () => ({ response: answer }),
    })),
  );
  const input = shadow.getElementById("vera-input") as HTMLInputElement;
  input.value = "What do you sell?";
  shadow.getElementById("vera-form")!.dispatchEvent(new Event("submit", { cancelable: true }));
  await vi.waitFor(() => expect(shadow.querySelector(".msg.bot")).not.toBeNull());
  return shadow.querySelector(".msg.bot") as HTMLElement;
}

beforeEach(() => {
  delete (window as unknown as { __veraLoaded?: boolean }).__veraLoaded;
  document.body.innerHTML = "";
  sessionStorage.clear();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("chat widget", () => {
  it("shows the tenant name as text, never as markup", () => {
    const shadow = loadWidget({ tenant: "cafe", subtitle: '<img src=x onerror="alert(1)">Cafe & Co' });
    const sub = shadow.querySelector(".hdr-sub")!;
    expect(sub.querySelector("img")).toBeNull();
    expect(sub.textContent).toContain('<img src=x onerror="alert(1)">Cafe & Co');
    const welcome = shadow.querySelector(".welcome-sub")!;
    expect(welcome.querySelector("img")).toBeNull();
  });

  it("escapes the widget title in the cafe subtitle", () => {
    const shadow = loadWidget({ "business-type": "cafe", "widget-title": "<b>Loft</b>" });
    const sub = shadow.querySelector(".hdr-sub")!;
    expect(sub.querySelector("b")).toBeNull();
    expect(sub.textContent).toContain("<b>Loft</b>");
  });

  it("only accepts hex colours", () => {
    const shadow = loadWidget({ "primary-color": "red;}*{visibility:hidden}", "accent-color": "#7C3AED" });
    const css = shadow.querySelector("style")!.textContent || "";
    expect(css).not.toContain("visibility:hidden");
    expect(css).toContain("#EC4899");
    expect(css).toContain("#7C3AED");
  });

  it("drops a javascript: call link and strips the WhatsApp number to digits", () => {
    const shadow = loadWidget({ "call-url": "javascript:alert(1)", whatsapp: '2547"><b>x' });
    const hrefs = Array.from(shadow.querySelectorAll("a")).map((a) => a.getAttribute("href") || "");
    expect(hrefs.some((h) => h.startsWith("javascript"))).toBe(false);
    expect(hrefs).toContain("https://wa.me/2547");
  });

  it("loads answer images only from allowed hosts", async () => {
    const shadow = loadWidget({ tenant: "cafe" });
    const bubble = await ask(
      shadow,
      [
        "![menu](https://media.codevertexafrica.com/menu.png)",
        "![api](https://marketflowai.codevertexafrica.com/files/a.png)",
        `![local](${window.location.origin}/logo.png)`,
        "![tracker](https://evil.example/pixel.png?u=1)",
      ].join("\n\n"),
    );
    const srcs = Array.from(bubble.querySelectorAll("img")).map((i) => i.getAttribute("src"));
    expect(srcs).toEqual([
      "https://media.codevertexafrica.com/menu.png",
      "https://marketflowai.codevertexafrica.com/files/a.png",
      `${window.location.origin}/logo.png`,
    ]);
    expect(bubble.innerHTML).not.toContain("evil.example");
    expect(bubble.querySelector(".img-off")?.textContent).toBe("tracker");
  });

  it("still escapes markup in answers", async () => {
    const shadow = loadWidget({ tenant: "cafe" });
    const bubble = await ask(shadow, '<img src=x onerror="alert(1)"> **bold**');
    expect(bubble.querySelector("img")).toBeNull();
    expect(bubble.querySelector("strong")?.textContent).toBe("bold");
  });
});
