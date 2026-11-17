import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  type UserProfile,
  generateCodeVerifier,
  generateCodeChallenge,
  generateState,
  storeVerifier,
  storeState,
  consumeVerifier,
  buildAuthorizeUrl,
  buildLogoutUrl,
  exchangeCodeForTokens,
  fetchProfile,
  revokeServerSession,
} from "@/lib/auth/pkce";
import { apiClient, aiClient } from "@/lib/api/client";
import { isCookieSessionEnabled, scrubStoredTokens } from "@/lib/auth/session-mode";

const AUTH_STORAGE_KEY = "marketflow-auth";

// Cookie session: tokens stored by the old flow are dropped before the store loads.
if (isCookieSessionEnabled()) scrubStoredTokens(AUTH_STORAGE_KEY);

type AuthStatus = "idle" | "loading" | "syncing" | "authenticated" | "unauthenticated" | "error";

/**
 * The signed-in tokens. With the cookie session this is an in-memory mirror of the access token
 * (refreshToken is always empty and the object is never persisted).
 */
interface Session {
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
}

interface AuthState {
  status: AuthStatus;
  user: UserProfile | null;
  session: Session | null;
  isAuthenticated: boolean;
  lastAuthenticatedAt: number | null;
  error: string | null;

  initialize: () => Promise<void>;
  redirectToSSO: (returnTo?: string, tenant?: string, opts?: { signup?: boolean; invite?: string; referralCode?: string }) => Promise<void>;
  handleSSOCallback: (code: string, callbackUrl: string) => Promise<void>;
  logout: () => Promise<void>;
  syncTenantToStorage: (user: UserProfile | null) => void;

  hasRole: (role: string) => boolean;
  hasPermission: (perm: string) => boolean;
  isPlatformOwner: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      status: "idle",
      user: null,
      session: null,
      isAuthenticated: false,
      lastAuthenticatedAt: null,
      error: null,

      initialize: async () => {
        if (isCookieSessionEnabled()) return initializeFromCookie();
        const { session, user } = get();
        if (!session?.accessToken) {
          set({ status: "unauthenticated" });
          return;
        }

        // Set token on API clients
        apiClient.defaults.headers.common.Authorization = `Bearer ${session.accessToken}`;
        aiClient.defaults.headers.common.Authorization = `Bearer ${session.accessToken}`;

        // Hydrate from storage if user profile exists and token hasn't expired.
        if (user && session.expiresAt) {
          const expiresAt = new Date(session.expiresAt).getTime();
          if (Date.now() < expiresAt - 60_000) {
            set({ status: "authenticated", isAuthenticated: true, lastAuthenticatedAt: Date.now() });
            return;
          }
        }

        set({ status: "loading" });

        try {
          const freshUser = await fetchProfile(session.accessToken);
          get().syncTenantToStorage(freshUser);
          set({
            user: freshUser,
            status: "authenticated",
            isAuthenticated: true,
            lastAuthenticatedAt: Date.now(),
          });
        } catch {
          set({ status: "unauthenticated", session: null, user: null, isAuthenticated: false });
        }
      },

      redirectToSSO: async (returnTo, tenant, opts) => {
        const verifier = generateCodeVerifier();
        const challenge = await generateCodeChallenge(verifier);
        const state = generateState();

        storeVerifier(verifier);
        storeState(state);

        if (returnTo) sessionStorage.setItem("sso_return_to", returnTo);

        const callbackUrl = tenant
          ? `${window.location.origin}/${tenant}/auth/callback`
          : `${window.location.origin}/auth/callback`;

        const url = buildAuthorizeUrl({ codeChallenge: challenge, state, redirectUri: callbackUrl, tenant, signup: opts?.signup, invite: opts?.invite, referralCode: opts?.referralCode });
        window.location.href = url;
      },

      handleSSOCallback: async (code, callbackUrl) => {
        set({ status: "syncing", error: null });

        const verifier = consumeVerifier();
        if (!verifier) {
          set({ status: "error", error: "Session expired. Please try again." });
          return;
        }

        try {
          const tokens = await exchangeCodeForTokens({ code, codeVerifier: verifier, redirectUri: callbackUrl });
          if (isCookieSessionEnabled()) return await startFromCallback(tokens.refresh_token);

          const session: Session = {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token || "",
            expiresAt: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          };

          // Set token on API clients
          apiClient.defaults.headers.common.Authorization = `Bearer ${session.accessToken}`;
          aiClient.defaults.headers.common.Authorization = `Bearer ${session.accessToken}`;

          set({ session });

          // Fetch profile with retry (JIT sync may take a moment)
          let attempts = 0;
          while (attempts < 5) {
            try {
              const user = await fetchProfile(session.accessToken);
              get().syncTenantToStorage(user);
              set({
                user,
                status: "authenticated",
                isAuthenticated: true,
                lastAuthenticatedAt: Date.now(),
              });
              return;
            } catch {
              attempts++;
              await new Promise((r) => setTimeout(r, 1500));
            }
          }

          // Profile fetch failed after retries but tokens are valid
          set({ status: "authenticated", lastAuthenticatedAt: Date.now() });
        } catch {
          set({ status: "error", error: "Sign-in failed. Please try again." });
        }
      },

      logout: async () => {
        // Capture the token BEFORE clearing local state so we can revoke the
        // backend session (Redis session_token keys + DB sessions).
        if (isCookieSessionEnabled()) {
          // Revokes this session, clears the sso cookie and signs out the other tabs.
          const { endCookieSession } = await import("@/lib/auth/cookie-session");
          await endCookieSession();
        } else {
          const token = get().session?.accessToken;
          await revokeServerSession(token);
        }

        get().syncTenantToStorage(null);
        set({
          status: "unauthenticated",
          user: null,
          session: null,
          isAuthenticated: false,
          lastAuthenticatedAt: null,
          error: null,
        });
        delete apiClient.defaults.headers.common.Authorization;
        delete aiClient.defaults.headers.common.Authorization;
        try { localStorage.removeItem(AUTH_STORAGE_KEY); } catch {}
        try { sessionStorage.clear(); } catch {}
        const returnTo = encodeURIComponent(window.location.origin);
        window.location.href = buildLogoutUrl(
          `https://accounts.codevertexafrica.com/login?return_to=${returnTo}`
        );
      },

      syncTenantToStorage: (user) => {
        if (user) {
          localStorage.setItem("mf_tenant_id", user.tenantId || "");
          localStorage.setItem("mf_tenant_slug", user.tenantSlug || "");
          localStorage.setItem("mf_preferred_slug", user.preferredSlug || user.tenantSlug || "");
          if (user.fboDistribId) localStorage.setItem("mf_distrib_id", user.fboDistribId);
          localStorage.setItem("mf_is_platform_owner", String(user.isPlatformOwner));
        } else {
          localStorage.removeItem("mf_tenant_id");
          localStorage.removeItem("mf_tenant_slug");
          localStorage.removeItem("mf_preferred_slug");
          localStorage.removeItem("mf_distrib_id");
          localStorage.removeItem("mf_is_platform_owner");
        }
      },

      hasRole: (role) => get().user?.roles?.includes(role) ?? false,
      hasPermission: (perm) => get().user?.permissions?.includes(perm) ?? false,
      isPlatformOwner: () => get().user?.isPlatformOwner ?? false,
    }),
    {
      name: AUTH_STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // The cookie session persists the profile only; the tokens stay in memory.
      partialize: (state) =>
        isCookieSessionEnabled()
          ? { user: state.user, isAuthenticated: state.isAuthenticated }
          : {
              session: state.session,
              user: state.user,
              isAuthenticated: state.isAuthenticated,
            },
      onRehydrateStorage: () => (state) => {
        if (state?.session?.accessToken && !isCookieSessionEnabled()) {
          apiClient.defaults.headers.common.Authorization = `Bearer ${state.session.accessToken}`;
          aiClient.defaults.headers.common.Authorization = `Bearer ${state.session.accessToken}`;
        }
        if (state?.user) {
          state.syncTenantToStorage(state.user);
        }
      },
    }
  )
);

/**
 * Cookie session start-up. The access token is not stored, so a stored profile gets its first
 * token through the sso cookie (one refresh) before the app counts as signed in. A refused cookie
 * signs out through the session's onChange (lib/auth/cookie-session.ts).
 */
async function initializeFromCookie(): Promise<void> {
  const { user, isAuthenticated } = useAuthStore.getState();
  if (!user && !isAuthenticated) {
    useAuthStore.setState({ status: "unauthenticated" });
    return;
  }
  useAuthStore.setState({ status: "loading" });

  const { getCookieSession } = await import("@/lib/auth/cookie-session");
  const token = await getCookieSession().getAccessToken();
  const now = useAuthStore.getState();
  if (now.status === "unauthenticated") return; // refused: onChange signed out already

  if (!token) {
    // auth-api unreachable. A known profile carries on and the API calls ask for a token again;
    // without one there is nothing to show, so the layouts send the person to sign in.
    useAuthStore.setState(
      now.user
        ? { status: "authenticated", isAuthenticated: true, lastAuthenticatedAt: Date.now() }
        : { status: "unauthenticated", isAuthenticated: false },
    );
    return;
  }

  if (now.user) {
    useAuthStore.setState({ status: "authenticated", isAuthenticated: true, lastAuthenticatedAt: Date.now() });
    return;
  }

  // No profile yet (another person signed in elsewhere and this page reloaded): load it.
  try {
    const freshUser = await fetchProfile(token);
    useAuthStore.getState().syncTenantToStorage(freshUser);
    useAuthStore.setState({
      user: freshUser,
      status: "authenticated",
      isAuthenticated: true,
      lastAuthenticatedAt: Date.now(),
    });
  } catch {
    useAuthStore.setState({ status: "unauthenticated", user: null, isAuthenticated: false });
  }
}

/**
 * Cookie session sign-in, after the code exchange: the refresh token goes to auth-api's cookie
 * and is dropped here, and the access token stays in memory. Neither is persisted.
 */
async function startFromCallback(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) {
    useAuthStore.setState({ status: "error", error: "Sign-in failed. Please try again." });
    return;
  }
  // A new sign-in replaces whoever was stored, so the new user id is not taken for a switch.
  useAuthStore.getState().syncTenantToStorage(null);
  useAuthStore.setState({ user: null, isAuthenticated: false });

  const { startCookieSession } = await import("@/lib/auth/cookie-session");
  const outcome = await startCookieSession(refreshToken);
  if (!("token" in outcome)) {
    useAuthStore.setState({ status: "error", error: "Sign-in failed. Please try again." });
    return;
  }

  // Fetch profile with retry (JIT sync may take a moment)
  for (let attempts = 0; attempts < 5; attempts++) {
    try {
      const user = await fetchProfile(outcome.token);
      useAuthStore.getState().syncTenantToStorage(user);
      useAuthStore.setState({
        user,
        status: "authenticated",
        isAuthenticated: true,
        lastAuthenticatedAt: Date.now(),
      });
      return;
    } catch {
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  // Profile fetch failed after retries but the session is valid
  useAuthStore.setState({ status: "authenticated", isAuthenticated: true, lastAuthenticatedAt: Date.now() });
}
