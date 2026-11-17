import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import type { RefreshOutcome } from "@bengo-hub/shared-ui-lib/auth";

import { isCookieSessionEnabled } from "@/lib/auth/session-mode";
import { AI_API_URL, API_URL } from "@/lib/urls";

// Service addresses live in lib/urls.ts; re-exported for existing imports.
export { AI_API_URL, API_URL };

// Main API client (marketflow-api)
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

/**
 * Request options for a FormData upload. The clients default to a JSON Content-Type, and axios 1.x
 * turns a FormData body sent as JSON into a JSON object, so the server got no multipart form
 * ("send a multipart form with a file of at most 2 MB"). Naming multipart keeps the FormData as
 * it is, and the browser then sets the type with its boundary.
 */
export const MULTIPART = { headers: { "Content-Type": "multipart/form-data" } } as const;

// AI API client (marketflow-ai)
export const aiClient = axios.create({
  baseURL: AI_API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 120000,
});

export const SUBSCRIPTIONS_API_URL = (
  process.env.NEXT_PUBLIC_SUBSCRIPTIONS_API_URL ||
  process.env.NEXT_PUBLIC_SUBSCRIPTIONS_URL ||
  "https://pricingapi.codevertexafrica.com"
).replace(/\/$/, "");

// subscriptions-api client (plan, billing, credits). It shares the signed-in token and the 401
// refresh, but sends only the tenant's identity, never MarketFlow-only headers such as X-Outlet-ID.
export const subscriptionsClient = axios.create({
  baseURL: SUBSCRIPTIONS_API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000,
});

// Request interceptor: attach tenant headers.
//
// Two contexts, both may apply for platform owners:
//   1. Tenant pages (/{orgSlug}/...) — always send X-Tenant-Slug resolved from
//      the URL. Works for both regular tenant users and platform owners
//      "acting as" a tenant. Lets the backend resolve tenant via DB lookup.
//   2. Platform pages (/platform/...) — no tenant header needed; backend
//      reads platform scope from JWT claims.
/**
 * The tenant headers for the current page, shared by the axios interceptor and
 * fetch-based calls (streams), so both always name the same tenant.
 */
export function tenantHeaders(): Record<string, string> {
  const out: Record<string, string> = {};
  if (typeof window === "undefined") return out;

  const path = window.location.pathname;
  const onPlatformPage = path.startsWith("/platform");
  const isPlatformOwner = localStorage.getItem("mf_is_platform_owner") === "true";

  // Skip tenant headers when the user is on /platform/* pages.
  if (onPlatformPage) return out;

  // Resolve tenant slug from URL first (platform owners on tenant pages),
  // then from localStorage (regular tenant users). tenantId from storage
  // only applies when it matches the URL slug — otherwise send slug alone
  // and let the backend resolve the UUID.
  const urlSlug = path.split("/").filter(Boolean)[0];
  const storedSlug = localStorage.getItem("mf_preferred_slug") || localStorage.getItem("mf_tenant_slug");
  const tenantId = localStorage.getItem("mf_tenant_id");
  const slug = urlSlug && urlSlug !== "auth" && urlSlug !== "403" ? urlSlug : storedSlug || "";

  if (slug) out["X-Tenant-Slug"] = slug;
  if (tenantId && !isPlatformOwner && (!urlSlug || urlSlug === storedSlug)) {
    // Regular tenant user: include UUID too (matches storage).
    out["X-Tenant-ID"] = tenantId;
  }

  // Attach outlet ID if set (for outlet-scoped requests)
  const outletId = outletIdGetter() || localStorage.getItem("marketflow-selected-outlet-id");
  if (outletId) {
    out["X-Outlet-ID"] = outletId;
  }
  return out;
}

const attachTenantHeaders = (config: InternalAxiosRequestConfig) => {
  for (const [k, v] of Object.entries(tenantHeaders())) config.headers[k] = v;
  return config;
};

apiClient.interceptors.request.use(attachTenantHeaders);
aiClient.interceptors.request.use(attachTenantHeaders);
subscriptionsClient.interceptors.request.use((config) => {
  const auth = apiClient.defaults.headers.common.Authorization;
  if (typeof auth === "string" && !config.headers.Authorization) config.headers.Authorization = auth;
  for (const [k, v] of Object.entries(tenantHeaders())) {
    if (k !== "X-Outlet-ID") config.headers[k] = v;
  }
  return config;
});

// Outlet ID getter — set by outlet-filter component
let outletIdGetter: () => string | null = () => null;
export function attachOutletIdGetter(getter: () => string | null) {
  outletIdGetter = getter;
}

/**
 * Points both API clients at a new access token. subscriptionsClient copies apiClient's header,
 * and the SSE streams (chat, marketing OS) read aiClient's, so this keeps every caller in step.
 */
export function setAccessToken(token: string) {
  apiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
  aiClient.defaults.headers.common.Authorization = `Bearer ${token}`;
}

/** Takes the token off both API clients (and so off subscriptionsClient and the streams). */
export function clearAccessToken() {
  delete apiClient.defaults.headers.common.Authorization;
  delete aiClient.defaults.headers.common.Authorization;
}

/**
 * The Authorization header for a call made outside the axios clients (the SSE streams, the
 * Treasury wallet). With the cookie session a fresh page has no token yet, so this waits for the
 * first one. Without it, it is the header the clients already carry.
 */
export async function authorizationHeader(): Promise<string | undefined> {
  if (isCookieSessionEnabled()) {
    const { cookieAccessToken } = await import("@/lib/auth/cookie-session");
    const token = await cookieAccessToken();
    return token ? `Bearer ${token}` : undefined;
  }
  const auth = aiClient.defaults.headers.common.Authorization;
  return typeof auth === "string" ? auth : undefined;
}

/**
 * The access token for a direct fetch to another service. With the cookie session it waits for a
 * token that is not about to run out; without it, it is the stored session's token as before.
 */
export async function currentAccessToken(): Promise<string | null> {
  if (isCookieSessionEnabled()) {
    const { cookieAccessToken } = await import("@/lib/auth/cookie-session");
    return cookieAccessToken();
  }
  const { useAuthStore } = await import("@/store/auth-store");
  return useAuthStore.getState().session?.accessToken ?? null;
}

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

/**
 * Cookie session only: every request waits for the in-memory token, so the first call after a
 * reload is sent after the one refresh instead of without a token. A retry carries its own token.
 */
const attachCookieToken = async (config: RetriableConfig) => {
  if (!isCookieSessionEnabled() || config._retried) return config;
  const { cookieAccessToken } = await import("@/lib/auth/cookie-session");
  const token = await cookieAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
};

apiClient.interceptors.request.use(attachCookieToken);
aiClient.interceptors.request.use(attachCookieToken);
subscriptionsClient.interceptors.request.use(attachCookieToken);

// 401 callback: replaces the default sign-out after auth-api refuses the session.
let on401Callback: (() => void) | null = null;
export function setOn401(cb: () => void) {
  on401Callback = cb;
}

// Several requests can fail at once; they share one refresh, so sign out only once.
let signingOut = false;
function signOutAfterRefusal() {
  if (on401Callback) return on401Callback();
  if (signingOut) return;
  signingOut = true;
  void import("@/store/auth-store")
    .then(({ useAuthStore }) => useAuthStore.getState().logout())
    .catch(() => undefined)
    .finally(() => {
      signingOut = false;
    });
}

// Response interceptor: handle 401 with the shared cross-tab-safe token refresh.
const handle401 = async (error: AxiosError & { config?: RetriableConfig }) => {
  const cfg = error.config;
  if (error.response?.status !== 401 || !cfg || cfg._retried) return Promise.reject(error);

  const sent = cfg.headers?.Authorization;
  const failedToken = typeof sent === "string" ? sent.replace(/^Bearer\s+/i, "") : null;
  let outcome: RefreshOutcome;
  if (isCookieSessionEnabled()) {
    // The token is in memory only, so a signed-in tab is known by its stored profile.
    const { hasStoredProfile, refreshCookieSession } = await import("@/lib/auth/cookie-session");
    if (!hasStoredProfile()) return Promise.reject(error);
    outcome = await refreshCookieSession(failedToken);
  } else {
    // Signed out already (public pages): there is no session to refresh or end.
    const { useAuthStore } = await import("@/store/auth-store");
    if (!useAuthStore.getState().session) return Promise.reject(error);
    const { refreshAccessToken } = await import("@/lib/auth/token-refresh");
    outcome = await refreshAccessToken(failedToken);
  }

  if ("token" in outcome) {
    // A token another tab saved is adopted the same way as one this tab refreshed.
    setAccessToken(outcome.token);
    cfg._retried = true;
    cfg.headers.Authorization = `Bearer ${outcome.token}`;
    // The config keeps its own baseURL, so this retries against the API that failed.
    return apiClient.request(cfg);
  }

  // A refused session signs out; an unreachable auth-api keeps the session and fails softly.
  if ("rejected" in outcome) signOutAfterRefusal();
  return Promise.reject(error);
};

apiClient.interceptors.response.use((r) => r, handle401);
aiClient.interceptors.response.use((r) => r, handle401);
subscriptionsClient.interceptors.response.use((r) => r, handle401);
