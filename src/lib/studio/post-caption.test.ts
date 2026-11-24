import { describe, expect, it } from "vitest";
import { adWords, defaultPostCaption, ppbCaptionLine } from "./post-caption";

const ppb = { ppb_approval: { reference: "PPB/ADV/123", caption_line: "PPB approval ref. PPB/ADV/123" } };

// Pharmacy hand-off 2026-11-14: a pharmacy's medicine post always shows its PPB approval line.
describe("default post caption", () => {
  it("keeps the words and the lead link when there is no PPB line", () => {
    expect(defaultPostCaption("Shea butter\nOrder now", "https://x/l", undefined)).toBe("Shea butter\nOrder now\n\nhttps://x/l");
    expect(defaultPostCaption("Shea butter", undefined, {})).toBe("Shea butter");
  });
  it("ends with the PPB approval line, once", () => {
    expect(defaultPostCaption("Panadol 500mg", "https://x/l", ppb)).toBe("Panadol 500mg\n\nhttps://x/l\n\nPPB approval ref. PPB/ADV/123");
    expect(defaultPostCaption("Panadol\nPPB approval ref. PPB/ADV/123", undefined, ppb)).toBe("Panadol\nPPB approval ref. PPB/ADV/123");
  });
  it("reads the line only from metadata.ppb_approval.caption_line", () => {
    expect(ppbCaptionLine(ppb)).toBe("PPB approval ref. PPB/ADV/123");
    expect(ppbCaptionLine({ ppb_approval: "x" })).toBe("");
    expect(ppbCaptionLine(undefined)).toBe("");
  });
});

// 2026-11-25: a video ad's caption was only its link, which became the YouTube title.
describe("adWords", () => {
  it("reads a video ad's end card and a poster's copy", () => {
    expect(adWords({ end_card: { headline: "Digitika", subline: " Ages 6 to 16 ", cta: "Message us" }, script: {} })).toBe("Digitika\nAges 6 to 16\nMessage us");
    expect(adWords({ headline: "Poster", cta: "Call" })).toBe("Poster\nCall");
    expect(adWords(undefined)).toBe("");
  });
});

describe("caption contacts", () => {
  it("puts the end card's contacts between the ad's words and the link", () => {
    expect(defaultPostCaption("Digitika\nMessage us", "https://x.test/f/a", undefined, ["WhatsApp: +254 700 000 000", "Email: a@x.test"])).toBe(
      "Digitika\nMessage us\n\nWhatsApp: +254 700 000 000\nEmail: a@x.test\n\nhttps://x.test/f/a",
    );
    expect(defaultPostCaption("Digitika", undefined, undefined, [])).toBe("Digitika");
  });
});
