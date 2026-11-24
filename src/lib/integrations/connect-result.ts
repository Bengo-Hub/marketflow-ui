// Messages for a connect that came back with `?<provider>=error&reason=<code>`
// (marketflow-api integrations failConnect).

const providerNames: Record<string, string> = {
  meta: "Facebook / Instagram",
  google: "Google Calendar",
  tiktok: "TikTok for Business",
  youtube: "YouTube",
  google_ads: "Google Ads",
  tiktok_creator: "TikTok",
};

const reasons: Record<string, (name: string) => string> = {
  cancelled: (n) => `${n} connection was cancelled before it finished. Connect again when you are ready.`,
  state_expired: (n) => `The ${n} connect link expired (it lasts 10 minutes). Click Connect to start again.`,
  bad_state: (n) => `The ${n} connect link was not valid. Click Connect to start again.`,
  no_pages: () =>
    "Facebook did not share any Page with MarketFlow. Click Connect, choose Edit settings, tick at least one Facebook Page (and its Instagram account), then finish.",
  oauth_not_configured: (n) => `${n} is not set up on MarketFlow yet. Please contact Codevertex support.`,
  no_refresh_token: (n) =>
    n === "TikTok"
      ? "TikTok did not finish the connection. Please connect again."
      : `${n} did not grant offline access. Remove MarketFlow from your Google account's third-party access, then connect again.`,
  missing_scope: (n) =>
    n === "TikTok"
      ? "TikTok needs every permission on its screen to post your videos. Click Connect and leave them all ticked."
      : n === "Google Ads"
      ? "Google Ads needs its permission ticked on Google's screen. Click Connect and leave it ticked."
      : `${n} needs both permissions on Google's screen: uploading videos, and managing the videos MarketFlow posts. Click Connect and leave both ticked.`,
  no_account: (n) =>
    n === "TikTok for Business"
      ? "That TikTok login has no TikTok ads account yet. Create one (it is free and takes a few minutes), then connect again with the same login."
      : "That Google account cannot reach a Google Ads account that runs ads. Create a Google Ads account on this Google account (it is free to open), or sign in with the Google account that already has one, then connect again.",
  account_not_enabled: () =>
    "Google Ads found your account but it is not set up yet. Finish the setup in Google Ads (confirm billing and submit your first campaign), wait a few minutes, then connect again. A cancelled account shows the same message.",
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

/** Where to set up the missing account, for the errors a layperson cannot fix inside MarketFlow. */
const helpLinks: Record<string, Record<string, { label: string; href: string }>> = {
  google_ads: {
    no_account: { label: "Create a Google Ads account", href: "https://ads.google.com/home/" },
    account_not_enabled: { label: "Open Google Ads", href: "https://ads.google.com/aw/overview" },
  },
  tiktok: { no_account: { label: "Create a TikTok ads account", href: "https://ads.tiktok.com/" } },
  youtube: { no_channel: { label: "Create a YouTube channel", href: "https://www.youtube.com/create_channel" } },
};

/** A sign-up link to show next to a failed connect, or null. */
export function connectErrorHelp(provider: string, reason: string | null): { label: string; href: string } | null {
  if (!reason) return null;
  return helpLinks[provider]?.[reason] ?? null;
}
