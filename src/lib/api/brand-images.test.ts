import { describe, expect, it } from "vitest";
import { isBrandImagesRequired } from "./brand-images";

describe("brand images required", () => {
  it("recognises only the server's brand_images_required answer", () => {
    expect(isBrandImagesRequired({ response: { status: 409, data: { code: "brand_images_required", details: { min: 3 } } } })).toBe(true);
    expect(isBrandImagesRequired({ response: { status: 409, data: { code: "conflict" } } })).toBe(false);
    expect(isBrandImagesRequired({ response: { status: 400, data: { code: "brand_images_required" } } })).toBe(false);
    expect(isBrandImagesRequired(new Error("network"))).toBe(false);
    expect(isBrandImagesRequired(undefined)).toBe(false);
  });
});
