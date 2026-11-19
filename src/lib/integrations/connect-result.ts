// Messages for a connect that came back with `?<provider>=error&reason=<code>`
// (marketflow-api integrations failConnect).

const providerNames: Record<string, string> = {
  meta: "Facebook / Instagram",
  google: "Google Calendar",
  tiktok: "TikTok for Business",
  youtube: "YouTube",
  google_ads: "Google Ads",
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
  missing_scope: (n) =>
    n === "Google Ads"
      ? "Google Ads needs its permission ticked on Google's screen. Click Connect and leave it ticked."
      : `${n} needs both permissions on Google's screen: uploading videos, and managing the videos MarketFlow posts. Click Connect and leave both ticked.`,
  no_account: () =>
    "That Google account cannot reach a Google Ads account that runs ads. Sign in with the Google account that has access to your Google Ads account, then connect again.",
  account_read_failed: () =>
    "Google Ads did not list your accounts just now. Please connect again in a few minutes.",
  no_channel: () =>
    "That Google account has no YouTube channel yet. Create the channel on YouTube, or pick the Google account or brand account that owns it, then connect again.",
  channel_read_failed: () => "YouTube did not say which channel you picked. Please connect again in a few minutes.",
};

/** Text for a failed connect, or null when the page did not come back with an error. */
export function connectErrorText(provider: string, reason: string | null): string | null {
  if (!reason) return null;
  const name = providerNames[provider] ?? provider;
  const msg = reasons[reason];
  return msg ? msg(name) : `${name} could not be connected. Please try again; if it keeps failing, contact Codevertex support.`;
}

export const connectProviders = Object.keys(providerNames);
