const SSO_BASE_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || "https://sso.codevertexitsolutions.com";
const CLIENT_ID = process.env.NEXT_PUBLIC_SSO_CLIENT_ID || "marketflow-ui";

// ── PKCE Helpers ──────────────────────────────────────────────────────────

export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export async function generateCodeChallenge(verifier: string): Promise<string> {
  const data = new TextEncoder().encode(verifier);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(hash)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

// ── Session Storage (PKCE flow state) ─────────────────────────────────────

export function storeVerifier(v: string) { sessionStorage.setItem("pkce_verifier", v); }
export function consumeVerifier(): string | null {
  const v = sessionStorage.getItem("pkce_verifier");
  sessionStorage.removeItem("pkce_verifier");
  return v;
}
export function storeState(s: string) { sessionStorage.setItem("pkce_state", s); }
export function consumeState(): string | null {
  const s = sessionStorage.getItem("pkce_state");
  sessionStorage.removeItem("pkce_state");
  return s;
}

// ── SSO URL Builders ──────────────────────────────────────────────────────

export function buildAuthorizeUrl(opts: {
  codeChallenge: string;
  state: string;
  redirectUri: string;
  tenant?: string;
}): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: CLIENT_ID,
    redirect_uri: opts.redirectUri,
    scope: "openid profile email offline_access",
    state: opts.state,
    code_challenge: opts.codeChallenge,
    code_challenge_method: "S256",
  });
  if (opts.tenant) params.set("tenant", opts.tenant);
  return `${SSO_BASE_URL}/api/v1/authorize?${params.toString()}`;
}

export function buildLogoutUrl(postLogoutRedirectUri?: string): string {
  const url = new URL("/api/v1/auth/logout", SSO_BASE_URL);
  if (postLogoutRedirectUri) {
    url.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
  }
  return url.toString();
}

// ── Token Exchange ────────────────────────────────────────────────────────

export async function exchangeCodeForTokens(opts: {
  code: string;
  codeVerifier: string;
  redirectUri: string;
}): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const res = await fetch(`${SSO_BASE_URL}/api/v1/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: CLIENT_ID,
      code: opts.code,
      redirect_uri: opts.redirectUri,
      code_verifier: opts.codeVerifier,
    }),
  });
  if (!res.ok) throw new Error(`Token exchange failed: ${res.status}`);
  return res.json();
}

// ── Token Refresh ─────────────────────────────────────────────────────────

export async function refreshTokens(refreshToken: string): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}> {
  const res = await fetch(`${SSO_BASE_URL}/api/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken, client_id: CLIENT_ID }),
  });
  if (!res.ok) throw new Error(`Token refresh failed: ${res.status}`);
  return res.json();
}

// ── Profile Fetch (from SSO, NOT from service API) ────────────────────────

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: string[];
  tenantId: string;
  tenantSlug: string;
  isPlatformOwner: boolean;
  isSuperUser: boolean;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscriptionFeatures?: string[];
  subscriptionLimits?: Record<string, number>;
}

export async function fetchProfile(accessToken: string): Promise<UserProfile> {
  const res = await fetch(`${SSO_BASE_URL}/api/v1/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`Profile failed: ${res.status}`);
  const d = await res.json();
  return {
    id: d.id ?? "",
    email: d.email ?? "",
    fullName: d.profile?.name ?? d.full_name ?? "",
    roles: (d.roles ?? []) as string[],
    permissions: (d.permissions ?? []) as string[],
    tenantId: d.tenant_id ?? "",
    tenantSlug: d.tenant_slug ?? "",
    isPlatformOwner: d.is_platform_owner === true || d.tenant_slug === "codevertex",
    isSuperUser: (d.roles ?? []).includes("superuser"),
    subscriptionPlan: d.sub_plan,
    subscriptionStatus: d.sub_status,
    subscriptionFeatures: d.sub_features,
    subscriptionLimits: d.sub_limits,
  };
}
