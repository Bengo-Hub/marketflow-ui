/**
 * The cookie session flow for marketflow-ui (fleet plan G11, step 3a), used only when
 * NEXT_PUBLIC_COOKIE_SESSION is on (lib/auth/session-mode.ts).
 *
 * The refresh token lives in auth-api's HttpOnly `__Host-cv_refresh` cookie on the sso host and
 * the access token in memory only, through the shared `createCookieSession`. Nothing secret is
 * persisted: the `marketflow-auth` store keeps the profile (user, tenant ids) and the
 * in-memory `session` mirror exists only so components that read the token keep working.
 *
 * One sso cookie serves every Codevertex app, so signing in as someone else in another app moves
 * this app to that person at its next refresh. When the user id changes, the old person's tenant
 * and cache state is cleared and the page reloads at the root, which routes to the new person's
 * workspace. When the session goes away (refused, or ended in another tab), this tab signs out.
 */
import {
  createCookieSession,
  type CookieSession,
  type CookieSessionState,
  type RefreshOutcome,
} from "@bengo-hub/shared-ui-lib/auth";
import { clearAccessToken, setAccessToken } from "@/lib/api/client";
import { CLIENT_ID } from "@/lib/auth/pkce";
import { AUTH_API_URL } from "@/lib/urls";
import { useAuthStore } from "@/store/auth-store";

/** The outlet the person picked belongs to their tenant, so it goes with the mf_* keys. */
const OUTLET_KEY = "marketflow-selected-outlet-id";

let session: CookieSession | null = null;
/** True while this tab's own logout ends the session, so the null it reports is not a refusal. */
let ending = false;
/** True once a user switch started its reload, so a second token does not start another. */
let switching = false;
const resetListeners = new Set<() => void>();

/** Page navigation, kept on an object so tests can watch it (jsdom cannot navigate). */
export const sessionNavigation = {
  assign(url: string) {
    window.location.assign(url);
  },
};

/** The app's one cookie session, created on first use so a build with the flag off never opens it. */
export function getCookieSession(): CookieSession {
  if (!session) {
    session = createCookieSession({ authBaseUrl: AUTH_API_URL, clientId: CLIENT_ID, onChange: handleChange });
  }
  return session;
}

/** A profile is stored, so this browser was signed in before the page loaded. */
export function hasStoredProfile(): boolean {
  const { user, isAuthenticated } = useAuthStore.getState();
  return !!user || isAuthenticated;
}

/**
 * The access token for an API call. A fresh page has none in memory, so the first call spends one
 * refresh through the cookie and the rest wait for it. A visitor who never signed in gets null
 * without a call to auth-api.
 */
export async function cookieAccessToken(): Promise<string | null> {
  if (!hasStoredProfile()) return null;
  return getCookieSession().getAccessToken();
}

/** Trades the cookie for a new access token after a 401; see `CookieSession.refresh`. */
export function refreshCookieSession(failedToken?: string | null): Promise<RefreshOutcome> {
  return getCookieSession().refresh(failedToken);
}

/** Moves the session from the code exchange onto the cookie. The caller drops the refresh token. */
export function startCookieSession(refreshToken: string): Promise<RefreshOutcome> {
  return getCookieSession().start(refreshToken);
}

/** Revokes the session on auth-api, clears the cookie and signs out the other tabs. Never throws. */
export async function endCookieSession(): Promise<void> {
  ending = true;
  try {
    await getCookieSession().end();
  } finally {
    ending = false;
  }
}

/** Runs `listener` whenever the signed-in person goes away or changes (the query cache uses it). */
export function onSessionReset(listener: () => void): () => void {
  resetListeners.add(listener);
  return () => {
    resetListeners.delete(listener);
  };
}

function notifyReset() {
  for (const listener of resetListeners) {
    try {
      listener();
    } catch {
      /* one listener failing must not stop the others */
    }
  }
}

/** Removes the tenant state of the person who was signed in: every mf_* key and the outlet. */
export function clearTenantState() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (key.startsWith("mf_") || key === OUTLET_KEY)) keys.push(key);
    }
    for (const key of keys) localStorage.removeItem(key);
  } catch {
    /* storage blocked: nothing was kept there either */
  }
}

function userIdOf(user: unknown): string | null {
  if (!user || typeof user !== "object") return null;
  const id = (user as { id?: unknown }).id;
  return typeof id === "string" && id ? id : null;
}

function handleChange(state: CookieSessionState | null) {
  if (!state) {
    clearAccessToken();
    useAuthStore.setState({ session: null });
    if (!ending) signOutLocally();
    return;
  }
  setAccessToken(state.accessToken);
  useAuthStore.setState({
    session: { accessToken: state.accessToken, refreshToken: "", expiresAt: new Date(state.expiresAt).toISOString() },
  });
  const next = userIdOf(state.payload.user);
  const current = useAuthStore.getState().user?.id || null;
  if (next && current && next !== current) switchUser();
}

/**
 * The session was refused or ended in another tab. The profile and tenant state go, and the
 * layouts send the person to sign in again (a live sso session signs them straight back in).
 */
function signOutLocally() {
  if (!hasStoredProfile()) return;
  useAuthStore.getState().syncTenantToStorage(null);
  notifyReset();
  useAuthStore.setState({ status: "unauthenticated", user: null, isAuthenticated: false, lastAuthenticatedAt: null });
}

/** Another person signed in elsewhere: nothing of the old person's may stay on screen or in cache. */
function switchUser() {
  if (switching) return;
  switching = true;
  clearTenantState();
  notifyReset();
  // isAuthenticated stays, so the reload loads the new person's profile through the cookie.
  useAuthStore.setState({ user: null, isAuthenticated: true, status: "loading" });
  sessionNavigation.assign("/");
}

/** Forgets the session object and flags; for tests only. */
export function resetCookieSessionForTests() {
  session?.dispose();
  session = null;
  ending = false;
  switching = false;
  resetListeners.clear();
}
