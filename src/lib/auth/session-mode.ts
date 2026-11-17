/**
 * Which sign-in flow this build uses (fleet plan G11, step 3a).
 *
 * NEXT_PUBLIC_COOKIE_SESSION=true moves the refresh token into auth-api's HttpOnly cookie and keeps
 * the access token in memory only (lib/auth/cookie-session.ts). Unset or anything else keeps the
 * stored-token flow (lib/auth/token-refresh.ts) exactly as before. Next.js inlines NEXT_PUBLIC_*
 * values at build time, so the flag is fixed per build. It is read on each call so tests can
 * switch it with vi.stubEnv.
 */
export function isCookieSessionEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_COOKIE_SESSION;
  return v === "true" || v === "1";
}

/**
 * Drops the tokens the stored-token flow left in the persisted store, keeping the profile. The
 * auth store runs it before it loads, so a build that turns the flag on removes them on its first
 * page load. Here rather than in cookie-session.ts, which imports the store.
 */
export function scrubStoredTokens(storageKey: string) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return;
    const parsed = JSON.parse(raw) as { state?: Record<string, unknown> } | null;
    if (!parsed?.state || !("session" in parsed.state)) return;
    delete parsed.state.session;
    localStorage.setItem(storageKey, JSON.stringify(parsed));
  } catch {
    /* no storage (server render) or an unreadable entry: the store's own load handles it */
  }
}
