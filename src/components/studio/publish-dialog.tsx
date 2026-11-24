"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { TikTokPostOptions } from "@/components/studio/tiktok-post-options";
import { emptyTikTokDraft, tiktokOptions, tiktokProblem, type TikTokDraft } from "@/lib/studio/tiktok-post";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, ToneBadge } from "@/components/ui-kit";
import { useBestTimes, usePublishAccounts, useSchedulePost } from "@/hooks/use-publishing";
import { apiErrorMessage } from "@/lib/api/errors";
import { CAPTION_LIMIT, PLATFORM_LABEL, publishingApi, windowLabel, type PublishAccount } from "@/lib/api/publishing";

const bestFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", hour: "2-digit", minute: "2-digit" });
import { reconnectToDeleteHint } from "@/lib/studio/delete-from-platform";

/** The local date and time a datetime-local input shows, for a Date. */
export function toLocalInput(d: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Posts an approved video to the business's own accounts, now or at a set time. Accounts whose
 * platform is not switched on yet, or that lost a permission, are shown but cannot be picked, so
 * the owner sees why. The server checks every rule again before anything is posted.
 */
export function PublishDialog({
  open,
  onOpenChange,
  assetId,
  defaultCaption,
  videoSeconds = 0,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  defaultCaption?: string;
  /** The video's length, checked against the TikTok account's limit (0 when unknown; the server checks it too). */
  videoSeconds?: number;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const accounts = usePublishAccounts(open);
  const schedule = useSchedulePost();
  const [picked, setPicked] = useState<string[]>([]);
  const [caption, setCaption] = useState(defaultCaption ?? "");
  const [later, setLater] = useState(false);
  // "Now" is fixed when the dialog opens, so render stays pure; the server moves a past time to now.
  const [openedAt] = useState(() => Date.now());
  const [when, setWhen] = useState(() => toLocalInput(new Date(openedAt + 60 * 60_000)));
  const [kids, setKids] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const list = useMemo(() => accounts.data ?? [], [accounts.data]);
  const pickedAccounts = useMemo(() => list.filter((a) => picked.includes(a.id)), [list, picked]);
  const youtube = pickedAccounts.some((a) => a.platform === "youtube");
  // One TikTok account per post: TikTok's options and consent belong to the account they show.
  const tiktokAccount = pickedAccounts.find((a) => a.platform === "tiktok");
  const [tiktokDraft, setTikTokDraft] = useState<TikTokDraft>(emptyTikTokDraft);
  const [tiktokConsent, setTikTokConsent] = useState(false);
  const creator = useQuery({
    queryKey: ["tiktok-creator-info", tiktokAccount?.id],
    queryFn: () => publishingApi.tiktokCreatorInfo(tiktokAccount!.id),
    enabled: open && !!tiktokAccount,
    staleTime: 0, // TikTok asks for fresh creator info each time the options are shown
  });
  const tiktokBlock = tiktokAccount ? tiktokProblem(tiktokDraft, creator.data, videoSeconds, tiktokConsent) : null;
  // The posting plan's best times for the picked platforms (marketflow-api postingplan).
  const plan = useBestTimes(open);
  const [bestTime, setBestTime] = useState(false);
  const pickedPlatforms = useMemo(() => [...new Set(pickedAccounts.map((a) => a.platform))], [pickedAccounts]);
  const whenDate = new Date(when);
  const whenInvalid = later && (Number.isNaN(whenDate.getTime()) || whenDate.getTime() < openedAt);

  const toggle = (a: PublishAccount, on: boolean) => {
    if (!on) {
      setPicked((p) => p.filter((id) => id !== a.id));
      return;
    }
    if (a.platform !== "tiktok") {
      setPicked((p) => [...p, a.id]);
      return;
    }
    // Picking another TikTok account replaces the first and starts its choices over.
    setTikTokDraft(emptyTikTokDraft);
    setTikTokConsent(false);
    setPicked((p) => [...p.filter((id) => list.find((x) => x.id === id)?.platform !== "tiktok"), a.id]);
  };

  const submit = () => {
    setError(null);
    schedule.mutate(
      {
        asset_id: assetId,
        connected_account_ids: picked,
        caption: caption.trim(),
        scheduled_at: later ? whenDate.toISOString() : undefined,
        best_time: bestTime || undefined,
        made_for_kids: youtube && kids,
        ...(tiktokAccount && creator.data
          ? { tiktok: tiktokOptions(tiktokDraft, creator.data), tiktok_consent: tiktokConsent }
          : {}),
      },
      {
        onSuccess: () => {
          setPicked([]);
          onOpenChange(false);
        },
        onError: (e) => setError(apiErrorMessage(e, "Could not schedule the post")),
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Post this video</DialogTitle>
          <DialogDescription>It goes to your own pages and channels, labelled as AI-made where the platform asks for it.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">Where to post</legend>
            {accounts.isLoading && <p className="text-sm text-muted-foreground">Loading your accounts...</p>}
            {accounts.isError && <p className="text-sm text-destructive">{apiErrorMessage(accounts.error, "Could not load your accounts")}</p>}
            {accounts.isSuccess && list.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No page or channel is connected yet.{" "}
                <Link href={`/${orgSlug}/settings/integrations`} className="font-medium text-primary hover:underline">
                  Connect one
                </Link>
              </p>
            )}
            {list.map((a) => {
              const blocked = !a.enabled || a.needs_reconnect;
              return (
                <label
                  key={a.id}
                  className="flex min-h-11 items-center gap-3 rounded-lg border border-border px-3 py-2 has-[:disabled]:opacity-60"
                >
                  <Checkbox
                    checked={picked.includes(a.id)}
                    disabled={blocked}
                    onCheckedChange={(on) => toggle(a, on === true)}
                    aria-label={`${PLATFORM_LABEL[a.platform]}: ${a.display_name}`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.display_name || PLATFORM_LABEL[a.platform]}</span>
                    <span className="block text-xs text-muted-foreground">{PLATFORM_LABEL[a.platform]}</span>
                  </span>
                  {!a.enabled ? (
                    <ToneBadge tone="neutral">Coming soon</ToneBadge>
                  ) : a.needs_reconnect ? (
                    <ToneBadge tone="warning">Reconnect</ToneBadge>
                  ) : reconnectToDeleteHint(a) ? (
                    <span className="text-xs text-muted-foreground">{reconnectToDeleteHint(a)}</span>
                  ) : null}
                </label>
              );
            })}
          </fieldset>

          <Field
            label="Caption"
            htmlFor="publish-caption"
            hint={`${caption.length} of ${CAPTION_LIMIT}. The first line is the YouTube title.`}
            error={caption.length > CAPTION_LIMIT ? `Keep it under ${CAPTION_LIMIT} characters` : null}
          >
            <Textarea id="publish-caption" rows={4} value={caption} onChange={(e) => setCaption(e.target.value)} />
          </Field>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={later} onCheckedChange={(on) => setLater(on === true)} />
              Schedule for later
            </label>
            {later && (
              <Field label="Post at" htmlFor="publish-when" error={whenInvalid ? "Pick a time in the future" : null}>
                <Input id="publish-when" type="datetime-local" value={when} min={toLocalInput(new Date(openedAt))} onChange={(e) => setWhen(e.target.value)} />
              </Field>
            )}
            {pickedPlatforms.length > 0 && (
              <div className="space-y-2 rounded-lg border border-border bg-muted/30 px-3 py-2">
                <label className="flex items-start gap-2 text-sm">
                  <Checkbox className="mt-0.5" checked={bestTime} onCheckedChange={(on) => setBestTime(on === true)} />
                  <span>
                    Post at each platform&apos;s best time
                    <span className="block text-xs text-muted-foreground">
                      Each post waits for its platform&apos;s next best window{later ? " after the time above" : ""}
                      {plan.data ? `, in ${plan.data.timezone}` : ""}.
                    </span>
                  </span>
                </label>
                {plan.data && (
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {pickedPlatforms.map((p) => {
                      const info = plan.data.platforms[p];
                      if (!info) return null;
                      const next = new Date(info.next_best_time);
                      return (
                        <li key={p} className="flex flex-wrap items-center gap-x-2">
                          <span className="font-medium text-foreground">{PLATFORM_LABEL[p]}</span>
                          <span>next best time {bestFmt.format(next)}</span>
                          {later && (
                            <button type="button" className="text-primary hover:underline" onClick={() => setWhen(toLocalInput(next))}>
                              Use it
                            </button>
                          )}
                          <span className="basis-full">{info.windows.map(windowLabel).join("; ")}</span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </div>

          {youtube && (
            <label className="flex items-start gap-2 text-sm">
              <Checkbox className="mt-0.5" checked={kids} onCheckedChange={(on) => setKids(on === true)} />
              <span>
                Made for children
                <span className="block text-xs text-muted-foreground">YouTube asks this of every video. Tick it only if children are the audience.</span>
              </span>
            </label>
          )}

          {tiktokAccount && (
            <TikTokPostOptions
              info={creator.data}
              loading={creator.isLoading}
              error={creator.isError ? apiErrorMessage(creator.error, "Could not load your TikTok account") : null}
              draft={tiktokDraft}
              onChange={setTikTokDraft}
              consent={tiktokConsent}
              onConsent={setTikTokConsent}
            />
          )}

          {tiktokBlock && !creator.isLoading && !creator.isError && (
            <p className="text-xs text-muted-foreground">{tiktokBlock}</p>
          )}

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={schedule.isPending}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={schedule.isPending || picked.length === 0 || whenInvalid || caption.length > CAPTION_LIMIT || !!tiktokBlock}>
            {schedule.isPending ? "Working..." : later || bestTime ? "Schedule" : "Post now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
