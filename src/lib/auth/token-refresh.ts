/**
 * Access-token refresh for marketflow-ui, built on the shared cross-tab-safe refresher
 * (@bengo-hub/shared-ui-lib/auth createSessionRefresher). auth-api rotates the refresh token on
 * every refresh, so two tabs refreshing at once used to strand the session. Now, before spending
 * the refresh token, a tab picks up a newer session another tab saved, tabs take turns refreshing
 * through the Web Locks API, and an enrolment-only answer counts as signed out. See the shared
 * module for the full story.
 */

import {
  createSessionRefresher,
  watchSessionAcrossTabs,
  type RefreshOutcome,
} from "@bengo-hub/shared-ui-lib/auth";
import { setAccessToken } from "@/lib/api/client";
import { refreshTokens } from "@/lib/auth/pkce";
import { useAuthStore } from "@/store/auth-store";

/** The persisted store key; also names the cross-tab refresh lock and the storage watcher. */
export const AUTH_STORAGE_KEY = "marketflow-auth";

const refreshSession = createSessionRefresher({
  lockName: AUTH_STORAGE_KEY,
  getSession: () => useAuthStore.getState().session,
  // Rehydrating also points the API clients at the stored token (onRehydrateStorage).
  reloadSession: () => useAuthStore.persist.rehydrate(),
  saveSession: (session) => {
    useAuthStore.setState({ session });
    setAccessToken(session.accessToken);
  },
  refresh: (refreshToken) => refreshTokens(refreshToken),
});

/**
 * Returns a usable access token (`{ token }`), `{ rejected: true }` when auth-api refused the
 * session, or `{ transient: true }` when auth-api could not be reached. Pass the token the server
 * just rejected when it is known.
 */
export function refreshAccessToken(failedToken?: string | null): Promise<RefreshOutcome> {
  return refreshSession(failedToken);
}

/**
 * Another tab renewed or replaced the session: load it here and point the API clients (and with
 * them the SSE streams, which read the aiClient default) at the new token, so this tab neither
 * sends a rotated-away token nor writes its stale copy back. Returns the unsubscribe function.
 */
export function watchSessionInOtherTabs(): () => void {
  return watchSessionAcrossTabs(AUTH_STORAGE_KEY, () => {
    void Promise.resolve(useAuthStore.persist.rehydrate()).then(() => {
      const token = useAuthStore.getState().session?.accessToken;
      if (token) setAccessToken(token);
    });
  });
}
