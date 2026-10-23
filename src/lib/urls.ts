/** Public URLs used across the app. NEXT_PUBLIC_* values are baked in at build time. */

export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://marketflow.codevertexafrica.com").replace(/\/$/, "");

export const API_URL = (process.env.NEXT_PUBLIC_API_URL || "https://marketflowapi.codevertexafrica.com").replace(/\/$/, "");

/** The accounts site (sign up, profile). Derived from the SSO host when not set. */
export const ACCOUNTS_URL = (
  process.env.NEXT_PUBLIC_AUTH_UI_URL ||
  (process.env.NEXT_PUBLIC_SSO_URL || "https://sso.codevertexafrica.com").replace("://sso.", "://accounts.")
).replace(/\/$/, "");

/** Plans and billing site. */
export const PRICING_URL = (process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL || "https://pricing.codevertexafrica.com").replace(/\/$/, "");

export function publicProfileUrl(slug: string): string {
  return `${APP_URL}/p/${encodeURIComponent(slug)}`;
}

export function funnelUrl(slug: string): string {
  return `${APP_URL}/f/${encodeURIComponent(slug)}`;
}

export function shortLinkUrl(code: string): string {
  return `${APP_URL}/s/${encodeURIComponent(code)}`;
}

export function signUpUrl(): string {
  return `${ACCOUNTS_URL}/register`;
}
