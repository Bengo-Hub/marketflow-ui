import type { TikTokCreatorInfo, TikTokOptions, TikTokPrivacy } from "@/lib/api/publishing";

/**
 * The TikTok part of the publish dialog follows TikTok's content sharing guidelines: the privacy
 * level has no default, comments, duets and stitches start off and stay off where the creator
 * turned them off, commercial content is disclosed only when the person says so, and the
 * consent line names TikTok's Music Usage Confirmation (plus the Branded Content Policy for
 * branded content).
 */

export interface TikTokDraft {
  privacy: TikTokPrivacy | "";
  allowComment: boolean;
  allowDuet: boolean;
  allowStitch: boolean;
  disclose: boolean;
  brandOrganic: boolean;
  brandContent: boolean;
}

export const emptyTikTokDraft: TikTokDraft = {
  privacy: "",
  allowComment: false,
  allowDuet: false,
  allowStitch: false,
  disclose: false,
  brandOrganic: false,
  brandContent: false,
};

export const MUSIC_USAGE_URL = "https://www.tiktok.com/legal/page/global/music-usage-confirmation/en";
export const BRANDED_CONTENT_URL = "https://www.tiktok.com/legal/page/global/bc-policy/en";

/** What still blocks the post, or null when the TikTok choices are complete. */
export function tiktokProblem(d: TikTokDraft, info: TikTokCreatorInfo | undefined, videoSeconds: number, consent: boolean): string | null {
  if (!info) return "Wait for your TikTok account details to load";
  if (info.max_video_post_duration_sec > 0 && videoSeconds > info.max_video_post_duration_sec)
    return `This TikTok account can post videos up to ${info.max_video_post_duration_sec} seconds`;
  if (!d.privacy) return "Choose who can see the TikTok post";
  if (!info.privacy_level_options.includes(d.privacy)) return "This TikTok account cannot use that audience";
  if (d.disclose && !d.brandOrganic && !d.brandContent) return "Say whether the video promotes your brand, a third party, or both";
  if (d.disclose && d.brandContent && d.privacy === "SELF_ONLY") return "Branded content cannot be private. Choose another audience";
  if (!consent) return "Agree to TikTok's terms below to post to TikTok";
  return null;
}

/** The options sent with the post. Interactions the creator turned off are never sent as on. */
export function tiktokOptions(d: TikTokDraft, info: TikTokCreatorInfo): TikTokOptions {
  return {
    privacy_level: d.privacy as TikTokPrivacy,
    allow_comment: d.allowComment && !info.comment_disabled,
    allow_duet: d.allowDuet && !info.duet_disabled,
    allow_stitch: d.allowStitch && !info.stitch_disabled,
    brand_organic: d.disclose && d.brandOrganic,
    brand_content: d.disclose && d.brandContent,
  };
}

/** The label TikTok puts on the post, shown so the person knows before posting. */
export function tiktokDisclosureLabel(d: TikTokDraft): string | null {
  if (!d.disclose) return null;
  if (d.brandContent) return "Your video will be labelled \"Paid partnership\".";
  if (d.brandOrganic) return "Your video will be labelled \"Promotional content\".";
  return null;
}
