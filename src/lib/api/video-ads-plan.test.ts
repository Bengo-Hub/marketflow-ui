import { describe, expect, it } from "vitest";
import { aspectClass, FORMATS } from "./creative";
import { frameLabel } from "./video-ads";

describe("landscape video and the generation plan (2026-11-19 audit)", () => {
  it("offers 1920x1080 first and keeps each preview in the ad's shape", () => {
    expect(FORMATS[0].value).toBe("1920x1080");
    expect(aspectClass("1920x1080")).toBe("aspect-video");
    expect(aspectClass("1080x1350")).toBe("aspect-4/5");
    expect(aspectClass("1080x1920")).toBe("aspect-9/16");
  });

  it("names where each scene's first frame comes from", () => {
    expect(frameLabel({ frame: "actor" })).toBe("The presenter");
    expect(frameLabel({ frame: "photo", origin: "offering", photo: 1 })).toBe("Product photo 1");
    expect(frameLabel({ frame: "photo", origin: "library", photo: 3 })).toBe("Brand picture 3");
    expect(frameLabel({ frame: "generated" })).toBe("New picture made for the scene");
  });
});
