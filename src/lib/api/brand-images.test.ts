import { describe, expect, it } from "vitest";
import { describeImport, isBrandImagesRequired } from "./brand-images";

describe("website import message", () => {
  const base = { sites: ["https://example.com"], found: 4, added: [], skipped: {}, total: 0, min: 3 };
  const img = { id: "1", url: "", content_type: "image/jpeg", width: 1200, height: 1200, bytes: 1, uploaded_at: "" };
  it("counts what was added and what is left", () => {
    expect(describeImport({ ...base, added: [img, img], total: 2 })).toBe("Added 2 pictures from your website. Upload 1 more to finish.");
    expect(describeImport({ ...base, added: [img], total: 3 })).toBe("Added 1 picture from your website.");
  });
  it("says where on the website the pictures were found", () => {
    const hero = { ...img, from: "Home page, hero" };
    const services = { ...img, from: "Services page" };
    expect(describeImport({ ...base, added: [hero, services, hero], total: 3 })).toBe(
      "Added 3 pictures from your website (Home page, hero; Services page).",
    );
  });
  it("explains why nothing was added", () => {
    expect(describeImport({ ...base, found: 0 })).toMatch(/No pictures were found/);
    expect(describeImport({ ...base, skipped: { too_small: 3 } })).toMatch(/too small/);
    expect(describeImport(base)).toMatch(/No new pictures/);
  });
});

describe("brand images required", () => {
  it("recognises only the server's brand_images_required answer", () => {
    expect(isBrandImagesRequired({ response: { status: 409, data: { code: "brand_images_required", details: { min: 3 } } } })).toBe(true);
    expect(isBrandImagesRequired({ response: { status: 409, data: { code: "conflict" } } })).toBe(false);
    expect(isBrandImagesRequired({ response: { status: 400, data: { code: "brand_images_required" } } })).toBe(false);
    expect(isBrandImagesRequired(new Error("network"))).toBe(false);
    expect(isBrandImagesRequired(undefined)).toBe(false);
  });
});
