/**
 * Funnel A/B testing (Sprint 7 #53). Each visitor keeps one bucket (0-99) in a cookie; a bucket
 * below the test's split sees version B (marketflow-api funnels.VariantFor).
 */
export const AB_COOKIE = "mf_ab";
export const AB_HEADER = "x-mf-ab";

export interface ABVariant {
  headline?: string;
  subheadline?: string;
  hero_image_url?: string;
}

export interface PublicABTest {
  split: number;
  b: ABVariant;
}

/** A stored bucket, or null when the value is not one. */
export function parseBucket(v: string | null | undefined): number | null {
  if (!v || !/^\d{1,2}$/.test(v)) return null;
  return Number(v);
}

export function newBucket(): number {
  return Math.floor(Math.random() * 100);
}

export function variantFor(ab: PublicABTest | undefined, bucket: number | null): "a" | "b" {
  return ab && bucket !== null && bucket < ab.split ? "b" : "a";
}

/** The page copy a visitor sees: version B's fields replace A's where set. */
export function applyVariant<T extends { headline?: string; subheadline?: string; hero_image_url?: string; ab_test?: PublicABTest }>(
  f: T,
  variant: "a" | "b",
): T {
  if (variant !== "b" || !f.ab_test) return f;
  const b = f.ab_test.b;
  return {
    ...f,
    headline: b.headline || f.headline,
    subheadline: b.subheadline || f.subheadline,
    hero_image_url: b.hero_image_url || f.hero_image_url,
  };
}
