/**
 * Security headers for every response the dashboard serves (OWASP review).
 *
 * next.config.ts imports this with a relative path, so it must stay free of "@/" imports and
 * of anything that only runs in the browser.
 *
 * Two CSPs go out together:
 * - an enforced one with only the parts that cannot break the app (no framing by other sites,
 *   no plugins, no <base> hijack);
 * - the full policy as Content-Security-Policy-Report-Only, so violations show in the browser
 *   console while the host lists are checked. Once it runs clean, it can move to the enforced
 *   header.
 *
 * The embeddable chat widget (/widget/chat.js) is loaded by a <script> tag on customers' sites,
 * so it gets its own rule and is left out of the generic one.
 */

type Env = Record<string, string | undefined>;

export interface HeaderRule {
  source: string;
  headers: { key: string; value: string }[];
}

/** Production defaults, matching src/lib/urls.ts and src/lib/api/*. */
const DEFAULTS = {
  api: "https://marketflowapi.codevertexafrica.com",
  ai: "https://marketflowai.codevertexafrica.com",
  sso: "https://sso.codevertexafrica.com",
  accounts: "https://accounts.codevertexafrica.com",
  subscriptions: "https://pricingapi.codevertexafrica.com",
  treasury: "https://booksapi.codevertexafrica.com",
  media: "https://media.codevertexafrica.com",
};

/** Video players a public profile may load in an iframe (src/components/public-profile/links.ts). */
const VIDEO_FRAME_HOSTS = ["https://www.youtube-nocookie.com", "https://player.vimeo.com"];

/** Path prefix of the embeddable widget under public/. */
export const WIDGET_PATH = "/widget";

function origin(value: string | undefined): string | null {
  if (!value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.origin : null;
  } catch {
    return null;
  }
}

function pick(env: Env, keys: string[], fallback: string): string {
  for (const k of keys) {
    const o = origin(env[k]);
    if (o) return o;
  }
  return fallback;
}

function unique(values: (string | null)[]): string[] {
  return [...new Set(values.filter((v): v is string => !!v))];
}

/** The browser-facing origins the app calls, resolved from NEXT_PUBLIC_* values with production defaults. */
export function appOrigins(env: Env) {
  const sso = pick(env, ["NEXT_PUBLIC_AUTH_API_URL", "NEXT_PUBLIC_SSO_URL"], DEFAULTS.sso);
  return {
    api: pick(env, ["NEXT_PUBLIC_API_URL"], DEFAULTS.api),
    ai: pick(env, ["NEXT_PUBLIC_AI_API_URL"], DEFAULTS.ai),
    sso,
    accounts: pick(env, ["NEXT_PUBLIC_AUTH_UI_URL"], sso.replace("://sso.", "://accounts.")),
    subscriptions: pick(env, ["NEXT_PUBLIC_SUBSCRIPTIONS_API_URL", "NEXT_PUBLIC_SUBSCRIPTIONS_URL"], DEFAULTS.subscriptions),
    treasury: pick(env, ["NEXT_PUBLIC_TREASURY_API_URL"], DEFAULTS.treasury),
    media: DEFAULTS.media,
    // Passed by the Dockerfile but not called from the browser today; allowed only when set.
    notifications: origin(env.NEXT_PUBLIC_NOTIFICATIONS_URL),
  };
}

/** Only the parts that are safe to enforce today. */
export const ENFORCED_CSP = "frame-ancestors 'self'; object-src 'none'; base-uri 'self'";

/** The full policy, sent as Report-Only until it has been checked against real traffic. */
export function reportOnlyCsp(env: Env, isDev = false): string {
  const o = appOrigins(env);
  const connect = unique(["'self'", o.api, o.ai, o.sso, o.subscriptions, o.treasury, o.media, o.notifications, ...(isDev ? ["ws:", "wss:"] : [])]);
  const directives: [string, string[]][] = [
    ["default-src", ["'self'"]],
    // Next inlines its bootstrap scripts without a nonce, so 'unsafe-inline' stays for now.
    // The dev server needs eval for fast refresh.
    ["script-src", ["'self'", "'unsafe-inline'", ...(isDev ? ["'unsafe-eval'"] : [])]],
    // next/font self-hosts the Google fonts, so no font host is needed.
    ["style-src", ["'self'", "'unsafe-inline'"]],
    ["img-src", ["'self'", "data:", "blob:", "https:"]],
    ["font-src", ["'self'", "data:"]],
    ["connect-src", connect],
    // Generated videos can come from the media bucket or a provider's URL.
    ["media-src", ["'self'", "blob:", "https:"]],
    ["frame-src", unique(["'self'", ...VIDEO_FRAME_HOSTS])],
    ["worker-src", ["'self'", "blob:"]],
    ["manifest-src", ["'self'"]],
    ["object-src", ["'none'"]],
    ["base-uri", ["'self'"]],
    ["form-action", unique(["'self'", o.sso, o.accounts])],
    ["frame-ancestors", ["'self'"]],
  ];
  return directives.map(([name, values]) => `${name} ${values.join(" ")}`).join("; ");
}

/** The value for next.config.ts headers(). */
export function securityHeaders(env: Env = {}, isDev = false): HeaderRule[] {
  return [
    {
      // Everything except the widget. "/" matches too, since (.*) may be empty.
      source: `/((?!${WIDGET_PATH.slice(1)}/).*)`,
      headers: [
        { key: "X-Frame-Options", value: "SAMEORIGIN" },
        { key: "Content-Security-Policy", value: ENFORCED_CSP },
        { key: "Content-Security-Policy-Report-Only", value: reportOnlyCsp(env, isDev) },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        // The app uses none of these; the clipboard is unaffected.
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      ],
    },
    {
      // Loaded by <script src> on customers' sites. It is a plain script load (no crossorigin
      // attribute), so no CORS header is needed; CORP lets sites with COEP load it.
      source: `${WIDGET_PATH}/:path*`,
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Cross-Origin-Resource-Policy", value: "cross-origin" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ];
}
