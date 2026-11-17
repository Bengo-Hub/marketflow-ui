import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The flag is read when the auth store loads, so it is set before any import below runs.
vi.hoisted(() => {
  process.env.NEXT_PUBLIC_COOKIE_SESSION = "true";
});

import { aiClient, apiClient, authorizationHeader } from "@/lib/api/client";
import {
  onSessionReset,
  refreshCookieSession,
  resetCookieSessionForTests,
  sessionNavigation,
} from "@/lib/auth/cookie-session";
import { storeVerifier } from "@/lib/auth/pkce";
import { scrubStoredTokens } from "@/lib/auth/session-mode";
import { useAuthStore } from "@/store/auth-store";

// Every token in this file is a made-up fixture word, not a credential.
const STORAGE_KEY = "marketflow-auth";
const EXCHANGE_REFRESH = "exchange-refresh-fixture"; // secret-scan:allow
const EXCHANGE_ACCESS = "exchange-access-fixture"; // secret-scan:allow

type Reply = { status: number; body?: unknown };
let refreshReplies: Reply[] = [];
let startReply: Reply = { status: 200 };
const calls: { url: string; init: RequestInit }[] = [];

function sessionBody(token: string, userId = "user-a") {
  return { access_token: token, token_type: "Bearer", expires_in: 900, user: { id: userId } };
}

/** A fake auth-api: the code exchange, the /session routes and /auth/me. */
const fetchMock = vi.fn(async (input: RequestInfo | URL, init: RequestInit = {}) => {
  const url = String(input);
  calls.push({ url, init });
  const reply = (r: Reply) => new Response(JSON.stringify(r.body ?? {}), { status: r.status });
  if (url.endsWith("/api/v1/token")) {
    return reply({ status: 200, body: { access_token: EXCHANGE_ACCESS, refresh_token: EXCHANGE_REFRESH, expires_in: 900 } });
  }
  if (url.endsWith("/api/v1/session/start")) return reply(startReply);
  if (url.endsWith("/api/v1/session/refresh")) return reply(refreshReplies.shift() ?? { status: 401 });
  if (url.endsWith("/api/v1/session/end")) return reply({ status: 200, body: { status: "logged_out" } });
  if (url.endsWith("/api/v1/auth/me")) {
    return reply({ status: 200, body: { id: "user-a", email: "a@example.com", tenant_slug: "acme", tenant_id: "tenant-a" } });
  }
  return reply({ status: 404 });
});

/** A fake marketflow-api: only "cookie-2" is accepted. */
const VALID = new Set(["cookie-2"]);
const seen: string[] = [];
async function adapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const token = String(config.headers.Authorization ?? "").replace(/^Bearer\s+/, "");
  seen.push(token);
  const response = { data: { token }, status: 200, statusText: "OK", headers: {}, config };
  if (VALID.has(token)) return response;
  throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, { ...response, data: {}, status: 401, statusText: "Unauthorized" });
}

function storageDump(): string {
  let out = "";
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i) ?? "";
    out += `${key}=${localStorage.getItem(key)}\n`;
  }
  return out;
}

const signedInProfile = {
  id: "user-a",
  email: "a@example.com",
  fullName: "A",
  roles: [],
  permissions: [],
  tenantId: "tenant-a",
  tenantSlug: "acme",
  preferredSlug: "acme",
  isPlatformOwner: false,
  isSuperUser: false,
};

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
  calls.length = 0;
  seen.length = 0;
  refreshReplies = [];
  startReply = { status: 200, body: sessionBody("cookie-1") };
  fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
  resetCookieSessionForTests();
  delete apiClient.defaults.headers.common.Authorization;
  delete aiClient.defaults.headers.common.Authorization;
  apiClient.defaults.adapter = adapter;
  useAuthStore.setState({ status: "idle", user: null, session: null, isAuthenticated: false, error: null });
});

afterEach(() => {
  resetCookieSessionForTests();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

afterAll(() => {
  delete process.env.NEXT_PUBLIC_COOKIE_SESSION;
});

describe("cookie session (NEXT_PUBLIC_COOKIE_SESSION on)", () => {
  it("keeps no token in localStorage after sign-in or a refresh", async () => {
    storeVerifier("verifier-fixture");
    await useAuthStore.getState().handleSSOCallback("code-fixture", "https://marketflow.example/auth/callback");

    expect(useAuthStore.getState().status).toBe("authenticated");
    expect(useAuthStore.getState().user?.id).toBe("user-a");
    const start = calls.find((c) => c.url.endsWith("/api/v1/session/start"));
    expect(start?.init.credentials).toBe("include");
    expect((start?.init.headers as Record<string, string>)["X-Requested-With"]).toBe("codevertex");
    expect(JSON.parse(String(start?.init.body))).toMatchObject({ refresh_token: EXCHANGE_REFRESH });
    expect(apiClient.defaults.headers.common.Authorization).toBe("Bearer cookie-1");

    refreshReplies = [{ status: 200, body: sessionBody("cookie-2") }];
    await expect(refreshCookieSession("cookie-1")).resolves.toEqual({ token: "cookie-2" });
    expect(aiClient.defaults.headers.common.Authorization).toBe("Bearer cookie-2");

    const dump = storageDump();
    expect(dump).toContain("user-a"); // the profile is kept
    for (const secret of [EXCHANGE_REFRESH, EXCHANGE_ACCESS, "cookie-1", "cookie-2"]) {
      expect(dump).not.toContain(secret);
    }
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").state).not.toHaveProperty("session");
  });

  it("drops the tokens the old flow stored and keeps the profile", () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: { session: { accessToken: "old-access", refreshToken: "old-refresh" }, user: { id: "user-a" }, isAuthenticated: true }, // secret-scan:allow
        version: 0,
      }),
    );
    scrubStoredTokens(STORAGE_KEY);
    const state = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").state;
    expect(state).not.toHaveProperty("session");
    expect(state).toMatchObject({ user: { id: "user-a" }, isAuthenticated: true });
  });

  it("makes the first call after a reload wait for a token, then retries a 401 with the token from refresh()", async () => {
    useAuthStore.setState({ user: signedInProfile, isAuthenticated: true });
    refreshReplies = [
      { status: 200, body: sessionBody("cookie-1") },
      { status: 200, body: sessionBody("cookie-2") },
    ];

    const res = await apiClient.get("/a");

    expect(res.data.token).toBe("cookie-2");
    expect(seen).toEqual(["cookie-1", "cookie-2"]);
    expect(calls.filter((c) => c.url.endsWith("/api/v1/session/refresh"))).toHaveLength(2);
  });

  it("gives the streams a token on a fresh page", async () => {
    useAuthStore.setState({ user: signedInProfile, isAuthenticated: true });
    refreshReplies = [{ status: 200, body: sessionBody("cookie-1") }];
    await expect(authorizationHeader()).resolves.toBe("Bearer cookie-1");
  });

  it("asks auth-api nothing for a visitor who never signed in", async () => {
    await expect(authorizationHeader()).resolves.toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it("clears the mf_* keys and the cache when another person signs in elsewhere", async () => {
    const assign = vi.spyOn(sessionNavigation, "assign").mockImplementation(() => {});
    const reset = vi.fn();
    onSessionReset(reset);
    useAuthStore.setState({ user: signedInProfile, isAuthenticated: true });
    localStorage.setItem("mf_tenant_id", "tenant-a");
    localStorage.setItem("mf_tenant_slug", "acme");
    localStorage.setItem("mf_is_platform_owner", "false");
    localStorage.setItem("marketflow-selected-outlet-id", "outlet-a");
    localStorage.setItem("theme", "dark");

    refreshReplies = [{ status: 200, body: sessionBody("cookie-b", "user-b") }];
    await refreshCookieSession();

    expect(Object.keys(localStorage).filter((k) => k.startsWith("mf_"))).toEqual([]);
    expect(localStorage.getItem("marketflow-selected-outlet-id")).toBeNull();
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(reset).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState().user).toBeNull();
    expect(assign).toHaveBeenCalledWith("/");
  });

  it("keeps the state when the same person's token is renewed", async () => {
    const assign = vi.spyOn(sessionNavigation, "assign").mockImplementation(() => {});
    useAuthStore.setState({ user: signedInProfile, isAuthenticated: true });
    localStorage.setItem("mf_tenant_id", "tenant-a");

    refreshReplies = [{ status: 200, body: sessionBody("cookie-2") }];
    await refreshCookieSession();

    expect(localStorage.getItem("mf_tenant_id")).toBe("tenant-a");
    expect(assign).not.toHaveBeenCalled();
  });

  it("signs out when auth-api refuses the cookie", async () => {
    useAuthStore.setState({ user: signedInProfile, isAuthenticated: true });
    localStorage.setItem("mf_tenant_id", "tenant-a");
    refreshReplies = [{ status: 401 }, { status: 401 }];

    await expect(refreshCookieSession()).resolves.toEqual({ rejected: true });

    expect(useAuthStore.getState()).toMatchObject({ status: "unauthenticated", user: null, isAuthenticated: false });
    expect(localStorage.getItem("mf_tenant_id")).toBeNull();
  });

  it("ends the cookie session on logout", async () => {
    useAuthStore.setState({ user: signedInProfile, isAuthenticated: true });
    refreshReplies = [{ status: 200, body: sessionBody("cookie-1") }];
    await refreshCookieSession();

    await useAuthStore.getState().logout();

    const end = calls.find((c) => c.url.endsWith("/api/v1/session/end"));
    expect(end?.init.method).toBe("POST");
    expect(end?.init.credentials).toBe("include");
    expect((end?.init.headers as Record<string, string>)["X-Requested-With"]).toBe("codevertex");
    expect((end?.init.headers as Record<string, string>).Authorization).toBe("Bearer cookie-1");
    // The stored-token revoke is not used with the cookie session.
    expect(calls.some((c) => c.url.endsWith("/api/v1/auth/logout"))).toBe(false);
    expect(useAuthStore.getState()).toMatchObject({ status: "unauthenticated", user: null });
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });
});
