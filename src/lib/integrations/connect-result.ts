// Messages for a connect that came back with `?<provider>=error&reason=<code>`
// (marketflow-api integrations failConnect).

const providerNames: Record<string, string> = {
  meta: "Facebook / Instagram",
  google: "Google Calendar",
  tiktok: "TikTok for Business",
};

const reasons: Record<string, (name: string) => string> = {
  cancelled: (n) => `${n} connection was cancelled before it finished. Connect again when you are ready.`,
  state_expired: (n) => `The ${n} connect link expired (it lasts 10 minutes). Click Connect to start again.`,
  bad_state: (n) => `The ${n} connect link was not valid. Click Connect to start again.`,
  no_pages: () =>
    "Facebook did not share any Page with MarketFlow. Click Connect, choose Edit settings, tick at least one Facebook Page (and its Instagram account), then finish.",
  oauth_not_configured: (n) => `${n} is not set up on MarketFlow yet. Please contact Codevertex support.`,
  no_refresh_token: (n) =>
    `${n} did not grant offline access. Remove MarketFlow from your Google account's third-party access, then connect again.`,
};

/** Text for a failed connect, or null when the page did not come back with an error. */
export function connectErrorText(provider: string, reason: string | null): string | null {
  if (!reason) return null;
  const name = providerNames[provider] ?? provider;
  const msg = reasons[reason];
  return msg ? msg(name) : `${name} could not be connected. Please try again; if it keeps failing, contact Codevertex support.`;
}

export const connectProviders = Object.keys(providerNames);
