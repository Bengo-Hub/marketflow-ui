import { describe, expect, it } from "vitest";
import { isTwoVoice, templateKind, templatesFor, type AdTemplate } from "./video-ads";

const tpl = (key: string, kinds: string[]): AdTemplate => ({ key, name: key, when_to_use: "", kinds, two_voice: false });
const list = [tpl("educate", ["template", "presenter"]), tpl("day-in-the-life", ["ugc", "presenter"]), tpl("myth-fact", ["template"])];

describe("ad template picker", () => {
  it("maps the video type and delivery to the library's kind", () => {
    expect(templateKind("template", "ugc")).toBe("ugc");
    expect(templateKind("presenter", "ad")).toBe("presenter");
    expect(templateKind("presenter_premium", "story")).toBe("presenter");
    expect(templateKind("template", "ad")).toBe("template");
  });
  it("offers only the templates that suit the video", () => {
    expect(templatesFor(list, "template", "ad").map((t) => t.key)).toEqual(["educate", "myth-fact"]);
    expect(templatesFor(list, "template", "ugc").map((t) => t.key)).toEqual(["day-in-the-life"]);
    expect(templatesFor(list, "presenter", "ad").map((t) => t.key)).toEqual(["educate", "day-in-the-life"]);
  });
});

describe("two voices", () => {
  const line = (voiceover: string, speaker?: "" | "male" | "female") => ({ id: "s", shot: "b_roll" as const, voiceover, caption: "", speaker });
  it("needs a spoken male and female line", () => {
    expect(isTwoVoice([line("Hi", "female"), line("Hello", "male")])).toBe(true);
    expect(isTwoVoice([line("Hi", "female"), line("Hello", "female")])).toBe(false);
    expect(isTwoVoice([line("Hi", "female"), line("  ", "male")])).toBe(false);
    expect(isTwoVoice([line("Hi"), line("Hello")])).toBe(false);
  });
});
