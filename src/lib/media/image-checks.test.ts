import { describe, expect, it } from "vitest";
import { checkImageDimensions, checkImageSize, checkImageType, formatBytes, imageCountLabel } from "./image-checks";

const limits = { maxBytes: 2 * 1024 * 1024, minShortSide: 1024 };

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
