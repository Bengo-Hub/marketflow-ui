/**
 * Checks an image before it is uploaded, so the owner hears about a wrong file at once. The
 * server checks the same things again; these only save a wasted upload.
 */

/** What the picker accepts. A WebP pick is turned into a JPEG in the browser, since the server keeps JPEG and PNG only. */
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export interface ImageLimits {
  maxBytes: number;
  minShortSide: number;
}

export function formatBytes(n: number): string {
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(n % (1024 * 1024) === 0 ? 0 : 1)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}

/** The type check, on the browser's reported type. */
export function checkImageType(type: string): string | null {
  return (ACCEPTED_IMAGE_TYPES as readonly string[]).includes(type) ? null : "Choose a JPEG, PNG or WebP picture.";
}

/** The size check, on the bytes that will be sent. */
export function checkImageSize(bytes: number, limits: ImageLimits): string | null {
  return bytes > limits.maxBytes ? `This picture is ${formatBytes(bytes)}. The limit is ${formatBytes(limits.maxBytes)}.` : null;
}

/** The resolution check: the short side must reach the minimum. */
export function checkImageDimensions(width: number, height: number, limits: ImageLimits): string | null {
  const short = Math.min(width, height);
  return short < limits.minShortSide
    ? `This picture is ${width} x ${height} px. Use one at least ${limits.minShortSide} px on its shorter side.`
    : null;
}

/** "3 of 5", with what is still needed to reach the minimum. */
export function imageCountLabel(count: number, min: number, max: number): string {
  const base = `${count} of ${max}`;
  if (count >= max) return `${base}. That is the most you can add; delete one to replace it.`;
  if (count < min) return `${base}. Add ${min - count} more to finish this step.`;
  return base;
}
