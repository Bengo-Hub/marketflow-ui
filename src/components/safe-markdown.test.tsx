import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SafeMarkdown, isAllowedImage, isExternalLink } from "./safe-markdown";

describe("SafeMarkdown", () => {
  it("loads images only from our hosts and shows the label for the rest", () => {
    const { container } = render(
      <SafeMarkdown>
        {[
          "![menu](https://media.codevertexafrica.com/a.png)",
          "![api](https://marketflowapi.codevertexafrica.com/media/b.png)",
          "![tracker](https://evil.example/pixel.png)",
          "![inline](data:image/png;base64,AAAA)",
        ].join("\n\n")}
      </SafeMarkdown>,
    );
    const srcs = Array.from(container.querySelectorAll("img")).map((i) => i.getAttribute("src"));
    expect(srcs).toEqual(["https://media.codevertexafrica.com/a.png", "https://marketflowapi.codevertexafrica.com/media/b.png"]);
    expect(screen.getByText("tracker").tagName).toBe("SPAN");
    expect(screen.getByText("tracker").closest("a")).toBeNull();
    expect(container.innerHTML).not.toContain("evil.example");
  });

  it("opens outside links in a new tab without passing the referrer", () => {
    render(<SafeMarkdown>{"[shop](https://shop.example/x) and [settings](/settings)"}</SafeMarkdown>);
    const out = screen.getByRole("link", { name: "shop" });
    expect(out).toHaveAttribute("target", "_blank");
    expect(out).toHaveAttribute("rel", "noopener noreferrer nofollow");
    const inside = screen.getByRole("link", { name: "settings" });
    expect(inside).not.toHaveAttribute("target");
  });

  it("checks image and link urls", () => {
    expect(isAllowedImage("http://media.codevertexafrica.com/a.png")).toBe(false);
    expect(isAllowedImage("data:image/png;base64,AAAA")).toBe(false);
    expect(isAllowedImage("/logo.png")).toBe(true);
    expect(isAllowedImage(undefined)).toBe(false);
    expect(isExternalLink("https://shop.example")).toBe(true);
    expect(isExternalLink("/x")).toBe(false);
    expect(isExternalLink("mailto:a@b.c")).toBe(false);
  });
});
