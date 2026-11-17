import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/auth/pkce", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/auth/pkce")>();
  return { ...actual, refreshTokens: vi.fn(), revokeServerSession: vi.fn() };
});

import { aiClient, apiClient } from "@/lib/api/client";
import { refreshTokens } from "@/lib/auth/pkce";
import { AUTH_STORAGE_KEY, watchSessionInOtherTabs } from "@/lib/auth/token-refresh";
import { useAuthStore } from "@/store/auth-store";

const refreshMock = vi.mocked(refreshTokens);
const logoutMock = vi.fn(async () => {});
const inAnHour = () => new Date(Date.now() + 3600_000).toISOString();

// Every token in this file is a made-up fixture word, not a credential.
/** A fake backend: the "fresh" and "other-tab" tokens are accepted, anything else gets a 401. */
const VALID = new Set(["fresh", "other-tab"]);
const seen: string[] = [];
async function adapter(config: InternalAxiosRequestConfig): Promise<AxiosResponse> {
  const token = String(config.headers.Authorization ?? "").replace(/^Bearer\s+/, "");
  seen.push(token);
  const response = { data: { ok: true, token }, status: 200, statusText: "OK", headers: {}, config };
  if (VALID.has(token)) return response;
  throw new AxiosError("Unauthorized", "ERR_BAD_REQUEST", config, null, {
    ...response,
    data: {},
    status: 401,
    statusText: "Unauthorized",
  });
}

function storedSession() {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  return raw ? (JSON.parse(raw) as { state: { session: { accessToken: string } | null } }).state.session : null;
}

beforeEach(() => {
  localStorage.clear();
  seen.length = 0;
  refreshMock.mockReset();
  logoutMock.mockClear();
  apiClient.defaults.adapter = adapter;
  aiClient.defaults.adapter = adapter;
  useAuthStore.setState({
    session: { accessToken: "stale", refreshToken: "refresh-1", expiresAt: inAnHour() },
    logout: logoutMock,
  });
  apiClient.defaults.headers.common.Authorization = "Bearer stale";
  aiClient.defaults.headers.common.Authorization = "Bearer stale";
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("401 refresh through the shared session refresher", () => {
  it("refreshes once for several concurrent 401s and retries each with the new token", async () => {
    let release: () => void = () => {};
    refreshMock.mockImplementation(
      () =>
        new Promise((resolve) => {
          release = () => resolve({ access_token: "fresh", refresh_token: "refresh-2", expires_in: 3600 });
        }),
    );

    const pending = [apiClient.get("/a"), aiClient.get("/b"), apiClient.get("/c")];
    await vi.waitFor(() => expect(refreshMock).toHaveBeenCalled());
    release();
    const results = await Promise.all(pending);

    expect(refreshMock).toHaveBeenCalledTimes(1);
    expect(refreshMock).toHaveBeenCalledWith("refresh-1");
    expect(results.map((r) => r.data.token)).toEqual(["fresh", "fresh", "fresh"]);
    expect(useAuthStore.getState().session).toMatchObject({ accessToken: "fresh", refreshToken: "refresh-2" });
    expect(storedSession()).toMatchObject({ accessToken: "fresh" });
    expect(apiClient.defaults.headers.common.Authorization).toBe("Bearer fresh");
    expect(aiClient.defaults.headers.common.Authorization).toBe("Bearer fresh");
    expect(logoutMock).not.toHaveBeenCalled();
  });

  it("adopts a token another tab already saved without spending the refresh token", async () => {
    // Another tab refreshed first and wrote the rotated session to the shared storage key.
    localStorage.setItem(
      AUTH_STORAGE_KEY,
      JSON.stringify({
        state: {
          session: { accessToken: "other-tab", refreshToken: "refresh-2", expiresAt: inAnHour() }, // secret-scan:allow
          user: null,
          isAuthenticated: true,
        },
        version: 0,
      }),
    );

    const res = await apiClient.get("/a");

    expect(refreshMock).not.toHaveBeenCalled();
    expect(res.data.token).toBe("other-tab");
    expect(useAuthStore.getState().session).toMatchObject({ accessToken: "other-tab", refreshToken: "refresh-2" }); // secret-scan:allow
    expect(apiClient.defaults.headers.common.Authorization).toBe("Bearer other-tab");
    expect(aiClient.defaults.headers.common.Authorization).toBe("Bearer other-tab");
  });

  it("points the API clients at a session another tab saved, as soon as the storage event fires", async () => {
    const stop = watchSessionInOtherTabs();
    try {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          state: {
            session: { accessToken: "other-tab", refreshToken: "refresh-2", expiresAt: inAnHour() }, // secret-scan:allow
            user: null,
            isAuthenticated: true,
          },
          version: 0,
        }),
      );
      window.dispatchEvent(new StorageEvent("storage", { key: AUTH_STORAGE_KEY }));

      await vi.waitFor(() => expect(aiClient.defaults.headers.common.Authorization).toBe("Bearer other-tab"));
      expect(apiClient.defaults.headers.common.Authorization).toBe("Bearer other-tab");
      expect(useAuthStore.getState().session?.refreshToken).toBe("refresh-2");
      expect(refreshMock).not.toHaveBeenCalled();
    } finally {
      stop();
    }
  });

  it("logs out once when auth-api refuses the refresh", async () => {
    refreshMock.mockRejectedValue(Object.assign(new Error("Token refresh failed: 401"), { status: 401 }));

    const results = await Promise.allSettled([apiClient.get("/a"), aiClient.get("/b")]);

    expect(results.every((r) => r.status === "rejected")).toBe(true);
    expect(refreshMock).toHaveBeenCalledTimes(1);
    await vi.waitFor(() => expect(logoutMock).toHaveBeenCalledTimes(1));
  });

  it("keeps the session when auth-api cannot be reached", async () => {
    refreshMock.mockRejectedValue(Object.assign(new Error("Token refresh failed: 503"), { status: 503 }));

    await expect(apiClient.get("/a")).rejects.toMatchObject({ response: { status: 401 } });
    await new Promise((r) => setTimeout(r, 0));

    expect(logoutMock).not.toHaveBeenCalled();
    expect(useAuthStore.getState().session?.refreshToken).toBe("refresh-1");
  });
});
