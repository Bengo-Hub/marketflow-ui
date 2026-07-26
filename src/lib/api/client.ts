import axios, { type InternalAxiosRequestConfig } from "axios";

// Next.js bakes NEXT_PUBLIC_* at build time. Defaults point at production
// DNS so a build that forgets to pass --build-arg still works; local dev
// overrides via .env.local.
export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://marketflowapi.codevertexafrica.com";
export const AI_API_URL =
  process.env.NEXT_PUBLIC_AI_API_URL || "https://marketflowai.codevertexafrica.com";

// Main API client (marketflow-api)
export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { "Content-Type": "application/json" },
});

// AI API client (marketflow-ai)
export const aiClient = axios.create({
  baseURL: AI_API_URL,
  headers: { "Content-Type": "application/json" },
  timeout: 120000,
});

// Request interceptor: attach tenant headers.
//
// Two contexts, both may apply for platform owners:
//   1. Tenant pages (/{orgSlug}/...) — always send X-Tenant-Slug resolved from
//      the URL. Works for both regular tenant users and platform owners
//      "acting as" a tenant. Lets the backend resolve tenant via DB lookup.
//   2. Platform pages (/platform/...) — no tenant header needed; backend
//      reads platform scope from JWT claims.
const attachTenantHeaders = (config: InternalAxiosRequestConfig) => {
  if (typeof window === "undefined") return config;

  const path = window.location.pathname;
  const onPlatformPage = path.startsWith("/platform");
  const isPlatformOwner = localStorage.getItem("mf_is_platform_owner") === "true";

  // Skip tenant headers when the user is on /platform/* pages.
  if (onPlatformPage) return config;

  // Resolve tenant slug from URL first (platform owners on tenant pages),
  // then from localStorage (regular tenant users). tenantId from storage
  // only applies when it matches the URL slug — otherwise send slug alone
  // and let the backend resolve the UUID.
  const urlSlug = path.split("/").filter(Boolean)[0];
  const storedSlug = localStorage.getItem("mf_preferred_slug") || localStorage.getItem("mf_tenant_slug");
  const tenantId = localStorage.getItem("mf_tenant_id");
  const slug = urlSlug && urlSlug !== "auth" && urlSlug !== "403" ? urlSlug : storedSlug || "";

  if (slug) config.headers["X-Tenant-Slug"] = slug;
  if (tenantId && !isPlatformOwner && (!urlSlug || urlSlug === storedSlug)) {
    // Regular tenant user: include UUID too (matches storage).
    config.headers["X-Tenant-ID"] = tenantId;
  }

  // Attach outlet ID if set (for outlet-scoped requests)
  const outletId = outletIdGetter() || localStorage.getItem("marketflow-selected-outlet-id");
  if (outletId) {
    config.headers["X-Outlet-ID"] = outletId;
  }

  return config;
};

apiClient.interceptors.request.use(attachTenantHeaders);
aiClient.interceptors.request.use(attachTenantHeaders);

// Outlet ID getter — set by outlet-filter component
let outletIdGetter: () => string | null = () => null;
export function attachOutletIdGetter(getter: () => string | null) {
  outletIdGetter = getter;
}

// 401 callback — set by auth provider to handle logout
let on401Callback: (() => void) | null = null;
export function setOn401(cb: () => void) {
  on401Callback = cb;
}

// Response interceptor: handle 401 with token refresh
const handle401 = async (error: any) => {
  if (error.response?.status === 401 && !error.config?._retried) {
    try {
      const { refreshTokens } = await import("@/lib/auth/pkce");
      const { useAuthStore } = await import("@/store/auth-store");
      const session = useAuthStore.getState().session;

      if (session?.refreshToken) {
        const data = await refreshTokens(session.refreshToken);
        const newToken = data.access_token;

        // Update store with new token
        useAuthStore.setState({
          session: {
            ...session,
            accessToken: newToken,
            refreshToken: data.refresh_token || session.refreshToken,
            expiresAt: new Date(Date.now() + (data.expires_in || 3600) * 1000).toISOString(),
          },
        });

        // Retry failed request
        error.config._retried = true;
        error.config.headers.Authorization = `Bearer ${newToken}`;
        apiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        aiClient.defaults.headers.common.Authorization = `Bearer ${newToken}`;
        return apiClient.request(error.config);
      }
    } catch {
      // Refresh failed — trigger logout
    }

    // Notify auth provider to handle logout
    on401Callback?.();
  }
  return Promise.reject(error);
};

apiClient.interceptors.response.use((r) => r, handle401);
aiClient.interceptors.response.use((r) => r, handle401);
