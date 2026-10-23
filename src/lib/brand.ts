/**
 * Tenant brand colour to theme tokens. Shared by the app shell (client) and the public pages
 * (server), so a tenant's colour looks the same everywhere and keeps its contrast in dark mode.
 */

/** Codevertex purple, the platform brand and MarketFlow's default. */
export const DEFAULT_BRAND_COLOR = "#9100B0";

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Returns a #rrggbb colour, or null when the value is not a hex colour. */
export function normalizeHex(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (!HEX.test(v)) return null;
  if (v.length === 4) {
    return `#${v[1]}${v[1]}${v[2]}${v[2]}${v[3]}${v[3]}`.toLowerCase();
  }
  return v.toLowerCase();
}

type Hsl = { h: number; s: number; l: number };

function hexToHsl(hex: string): Hsl {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
    else if (max === g) h = ((b - r) / d + 2) / 6;
    else h = ((r - g) / d + 4) / 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function triplet({ h, s, l }: Hsl): string {
  return `${h} ${s}% ${l}%`;
}

function relativeLuminance(hex: string): number {
  const ch = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * ch[0] + 0.7152 * ch[1] + 0.0722 * ch[2];
}

export type BrandTokens = {
  light: { primary: string; primaryDark: string; primaryForeground: string };
  dark: { primary: string; primaryDark: string; primaryForeground: string };
  rgb: string;
};

/**
 * Light mode uses the colour as given (white or near-black text, whichever reads better). Dark mode
 * lifts the lightness to 62-70% so the colour stays readable on the dark background.
 */
export function brandTokens(color: unknown): BrandTokens {
  const hex = normalizeHex(color) ?? DEFAULT_BRAND_COLOR;
  const hsl = hexToHsl(hex);
  const onLight = relativeLuminance(hex) > 0.45 ? "285 35% 10%" : "0 0% 100%";
  const darkL = Math.min(70, Math.max(62, hsl.l + 25));
  const darkS = Math.min(hsl.s, 85);
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return {
    light: {
      primary: triplet(hsl),
      primaryDark: triplet({ ...hsl, l: Math.max(18, hsl.l - 9) }),
      primaryForeground: onLight,
    },
    dark: {
      primary: triplet({ h: hsl.h, s: darkS, l: darkL }),
      primaryDark: triplet({ h: hsl.h, s: darkS, l: darkL - 10 }),
      primaryForeground: `${hsl.h} 60% 9%`,
    },
    rgb: `${r} ${g} ${b}`,
  };
}

/**
 * CSS for a brand colour, scoped to a selector (":root" for the app, a page wrapper class for the
 * public pages). Returns plain declarations only: the colour is validated, never echoed raw.
 */
export function brandCss(color: unknown, scope = ":root"): string {
  const t = brandTokens(color);
  const dark = scope === ":root" ? ".dark" : `.dark ${scope}`;
  return [
    `${scope}{--primary:${t.light.primary};--primary-dark:${t.light.primaryDark};--primary-foreground:${t.light.primaryForeground};--ring:${t.light.primary};--brand-primary:${t.rgb};}`,
    `${dark}{--primary:${t.dark.primary};--primary-dark:${t.dark.primaryDark};--primary-foreground:${t.dark.primaryForeground};--ring:${t.dark.primary};}`,
  ].join("");
}
