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

/** The most a small picture is enlarged to reach the minimum short side; beyond it, it looks soft. */
export const MAX_UPSCALE = 2;
/** The longest side kept: bigger pictures are scaled down, which also keeps the file small. */
export const MAX_LONG_SIDE = 2560;
/** Share of the size cap an encoded picture aims for, leaving room for the form around it. */
export const SIZE_HEADROOM = 0.9;

/**
 * The size a picture is resized to before upload (owner, 2026-11-14): a short side below the
 * minimum is enlarged up to MAX_UPSCALE times, a long side above MAX_LONG_SIDE is reduced (never
 * below the minimum short side), otherwise it keeps its size. resized says whether it changes;
 * error is set when it is too small even after enlarging.
 */
export function fitDimensions(width: number, height: number, limits: ImageLimits): { width: number; height: number; resized: boolean; error?: string } {
  const short = Math.min(width, height);
  const long = Math.max(width, height);
  let scale = 1;
  if (short < limits.minShortSide) {
    scale = limits.minShortSide / short;
    if (scale > MAX_UPSCALE) {
      return {
        width,
        height,
        resized: false,
        error: `This picture is ${width} x ${height} px, too small to enlarge well. Use one at least ${Math.ceil(limits.minShortSide / MAX_UPSCALE)} px on its shorter side.`,
      };
    }
  } else if (long > MAX_LONG_SIDE) {
    scale = Math.max(MAX_LONG_SIDE / long, limits.minShortSide / short);
  }
  if (scale === 1) return { width, height, resized: false };
  // Round up so the short side never lands a pixel below the minimum.
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const fix = (n: number, isShort: boolean) => (isShort && n < limits.minShortSide ? limits.minShortSide : n);
  return { width: fix(w, width <= height), height: fix(h, height < width), resized: true };
}

/** JPEG qualities tried, best first, until the file fits under the cap. */
export const JPEG_QUALITIES = [0.9, 0.85, 0.8, 0.72, 0.65] as const;

/** "3 of 5", with what is still needed to reach the minimum. */
export function imageCountLabel(count: number, min: number, max: number): string {
  const base = `${count} of ${max}`;
  if (count >= max) return `${base}. That is the most you can add; delete one to replace it.`;
  if (count < min) return `${base}. Add ${min - count} more to finish this step.`;
  return base;
}
