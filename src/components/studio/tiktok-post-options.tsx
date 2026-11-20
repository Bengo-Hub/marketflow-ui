"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Field } from "@/components/ui-kit";
import { TIKTOK_PRIVACY_LABEL, type TikTokCreatorInfo, type TikTokPrivacy } from "@/lib/api/publishing";
import {
  BRANDED_CONTENT_URL,
  MUSIC_USAGE_URL,
  tiktokDisclosureLabel,
  type TikTokDraft,
} from "@/lib/studio/tiktok-post";

/**
 * TikTok's posting options in the publish dialog (TikTok content sharing guidelines): who will
 * post, the audience with no preset choice, comments, duets and stitches unticked and greyed out
 * where the creator turned them off in TikTok, the commercial content disclosure, and the
 * consent line. The server checks the same rules again.
 */
export function TikTokPostOptions({
  info,
  loading,
  error,
  draft,
  onChange,
  consent,
  onConsent,
}: {
  info?: TikTokCreatorInfo;
  loading: boolean;
  error?: string | null;
  draft: TikTokDraft;
  onChange: (d: TikTokDraft) => void;
  consent: boolean;
  onConsent: (on: boolean) => void;
}) {
  const set = (patch: Partial<TikTokDraft>) => onChange({ ...draft, ...patch });
  const label = tiktokDisclosureLabel(draft);

  if (loading) return <p className="text-sm text-muted-foreground">Loading your TikTok account...</p>;
  if (error) return <p className="text-sm text-destructive">{error}</p>;
  if (!info) return null;

  const interaction = (key: "allowComment" | "allowDuet" | "allowStitch", text: string, off: boolean) => (
    <label className="flex items-center gap-2 text-sm has-[:disabled]:opacity-60">
      <Checkbox checked={!off && draft[key]} disabled={off} onCheckedChange={(on) => set({ [key]: on === true })} />
      {text}
      {off && <span className="text-xs text-muted-foreground">(turned off in your TikTok settings)</span>}
    </label>
  );

  return (
    <fieldset className="space-y-3 rounded-lg border border-border p-3">
      <legend className="px-1 text-sm font-medium">TikTok</legend>
      <div className="flex items-center gap-2">
        {info.avatar_url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={info.avatar_url} alt="" width={28} height={28} className="h-7 w-7 rounded-full object-cover" />
        )}
        <p className="text-sm">
          Posting as <span className="font-medium">{info.nickname || info.username}</span>
          {info.username && info.nickname && <span className="text-muted-foreground"> @{info.username}</span>}
        </p>
      </div>

      <Field label="Who can see this video" htmlFor="tiktok-privacy" required>
        <select
          id="tiktok-privacy"
          value={draft.privacy}
          onChange={(e) => set({ privacy: e.target.value as TikTokPrivacy | "" })}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="" disabled>
            Choose an audience
          </option>
          {info.privacy_level_options.map((p) => (
            <option key={p} value={p} disabled={p === "SELF_ONLY" && draft.disclose && draft.brandContent}>
              {TIKTOK_PRIVACY_LABEL[p] ?? p}
            </option>
          ))}
        </select>
      </Field>

      <div className="space-y-1.5">
        <p className="text-sm font-medium">Allow others to</p>
        {interaction("allowComment", "Comment", info.comment_disabled)}
        {interaction("allowDuet", "Duet", info.duet_disabled)}
        {interaction("allowStitch", "Stitch", info.stitch_disabled)}
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between gap-3 text-sm">
          <span>
            Disclose commercial content
            <span className="block text-xs text-muted-foreground">Turn on if this video promotes your business, a product or a third party.</span>
          </span>
          <Switch checked={draft.disclose} onCheckedChange={(on) => set({ disclose: on === true })} />
        </label>
        {draft.disclose && (
          <div className="space-y-1.5 pl-1">
            <label className="flex items-start gap-2 text-sm">
              <Checkbox className="mt-0.5" checked={draft.brandOrganic} onCheckedChange={(on) => set({ brandOrganic: on === true })} />
              <span>
                Your brand
                <span className="block text-xs text-muted-foreground">You are promoting yourself or your own business.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                className="mt-0.5"
                checked={draft.brandContent}
                onCheckedChange={(on) => set({ brandContent: on === true, privacy: on === true && draft.privacy === "SELF_ONLY" ? "" : draft.privacy })}
              />
              <span>
                Branded content
                <span className="block text-xs text-muted-foreground">You are promoting another brand or a third party. It cannot be private.</span>
              </span>
            </label>
            {label && <p className="text-xs text-muted-foreground">{label}</p>}
          </div>
        )}
      </div>

      <label className="flex items-start gap-2 text-sm">
        <Checkbox className="mt-0.5" checked={consent} onCheckedChange={(on) => onConsent(on === true)} />
        <span>
          By posting, you agree to TikTok&apos;s{" "}
          {draft.disclose && draft.brandContent && (
            <>
              <a href={BRANDED_CONTENT_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
                Branded Content Policy
              </a>{" "}
              and{" "}
            </>
          )}
          <a href={MUSIC_USAGE_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-primary hover:underline">
            Music Usage Confirmation
          </a>
          .
        </span>
      </label>
      <p className="text-xs text-muted-foreground">After you post, TikTok can take a few minutes to process the video before it shows on your profile.</p>
    </fieldset>
  );
}
