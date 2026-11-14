import { describe, expect, it } from "vitest";
import { defaultPostCaption, ppbCaptionLine } from "./post-caption";

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
