import { describe, expect, it } from "vitest";
import { checkImageDimensions, checkImageSize, checkImageType, fitDimensions, formatBytes, imageCountLabel, MAX_LONG_SIDE } from "./image-checks";

const limits = { maxBytes: 2 * 1024 * 1024, minShortSide: 1024 };

describe("resizing before upload", () => {
  it("enlarges a slightly small picture to the minimum short side", () => {
    expect(fitDimensions(1200, 800, limits)).toEqual({ width: 1536, height: 1024, resized: true });
    expect(fitDimensions(800, 1200, limits)).toEqual({ width: 1024, height: 1536, resized: true });
  });
  it("refuses a picture too small to enlarge well", () => {
    expect(fitDimensions(600, 400, limits).error).toMatch(/too small to enlarge well/);
  });
  it("keeps a picture that already fits", () => {
    expect(fitDimensions(1600, 1200, limits)).toEqual({ width: 1600, height: 1200, resized: false });
  });
  it("reduces a very large picture but never below the minimum short side", () => {
    const big = fitDimensions(6000, 4000, limits);
    expect(big.resized).toBe(true);
    expect(Math.max(big.width, big.height)).toBe(MAX_LONG_SIDE);
    expect(Math.min(big.width, big.height)).toBeGreaterThanOrEqual(limits.minShortSide);
    const panorama = fitDimensions(8000, 1100, limits);
    expect(panorama.height).toBeGreaterThanOrEqual(limits.minShortSide);
  });
});

describe("image checks before upload", () => {
  it("accepts JPEG, PNG and WebP only", () => {
    expect(checkImageType("image/jpeg")).toBeNull();
    expect(checkImageType("image/png")).toBeNull();
    expect(checkImageType("image/webp")).toBeNull();
    expect(checkImageType("image/gif")).toMatch(/JPEG, PNG or WebP/);
    expect(checkImageType("application/pdf")).not.toBeNull();
  });

  it("refuses a file over the size limit, saying both sizes", () => {
    expect(checkImageSize(limits.maxBytes, limits)).toBeNull();
    expect(checkImageSize(3 * 1024 * 1024, limits)).toBe("This picture is 3 MB. The limit is 2 MB.");
  });

  it("refuses a picture whose short side is below the minimum", () => {
    expect(checkImageDimensions(1600, 1024, limits)).toBeNull();
    expect(checkImageDimensions(2000, 900, limits)).toMatch(/2000 x 900 px.*at least 1024 px/);
  });

  it("counts against the maximum and says what is missing", () => {
    expect(imageCountLabel(1, 3, 5)).toBe("1 of 5. Add 2 more to finish this step.");
    expect(imageCountLabel(3, 3, 5)).toBe("3 of 5");
    expect(imageCountLabel(5, 3, 5)).toMatch(/^5 of 5\. That is the most/);
  });

  it("formats sizes plainly", () => {
    expect(formatBytes(512 * 1024)).toBe("512 KB");
    expect(formatBytes(1.5 * 1024 * 1024)).toBe("1.5 MB");
  });
});
