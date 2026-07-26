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

type AuthStatus = "idle" | "loading" | "syncing" | "authenticated" | "unauthenticated" | "error";

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
  redirectToSSO: (returnTo?: string, tenant?: string) => Promise<void>;
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

      redirectToSSO: async (returnTo, tenant) => {
        const verifier = generateCodeVerifier();
        const challenge = await generateCodeChallenge(verifier);
        const state = generateState();

        storeVerifier(verifier);
        storeState(state);

        if (returnTo) sessionStorage.setItem("sso_return_to", returnTo);

        const callbackUrl = tenant
          ? `${window.location.origin}/${tenant}/auth/callback`
          : `${window.location.origin}/auth/callback`;

        const url = buildAuthorizeUrl({ codeChallenge: challenge, state, redirectUri: callbackUrl, tenant });
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
        } catch (err) {
          set({ status: "error", error: "Sign-in failed. Please try again." });
        }
      },

      logout: async () => {
        // Capture the token BEFORE clearing local state so we can revoke the
        // backend session (Redis session_token keys + DB sessions).
        const token = get().session?.accessToken;
        await revokeServerSession(token);

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
        try { localStorage.removeItem("marketflow-auth"); } catch {}
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
      name: "marketflow-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        session: state.session,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        if (state?.session?.accessToken) {
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
