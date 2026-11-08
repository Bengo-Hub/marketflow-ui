"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, ToneBadge } from "@/components/ui-kit";
import { usePublishAccounts, useSchedulePost } from "@/hooks/use-publishing";
import { apiErrorMessage } from "@/lib/api/errors";
import { CAPTION_LIMIT, PLATFORM_LABEL, type PublishAccount } from "@/lib/api/publishing";

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
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  assetId: string;
  defaultCaption?: string;
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
  const whenDate = new Date(when);
  const whenInvalid = later && (Number.isNaN(whenDate.getTime()) || whenDate.getTime() < openedAt);

  const toggle = (a: PublishAccount, on: boolean) => setPicked((p) => (on ? [...p, a.id] : p.filter((id) => id !== a.id)));

  const submit = () => {
    setError(null);
    schedule.mutate(
      {
        asset_id: assetId,
        connected_account_ids: picked,
        caption: caption.trim(),
        scheduled_at: later ? whenDate.toISOString() : undefined,
        made_for_kids: youtube && kids,
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
      <DialogContent className="max-w-lg">
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
          <Button onClick={submit} disabled={schedule.isPending || picked.length === 0 || whenInvalid || caption.length > CAPTION_LIMIT}>
            {schedule.isPending ? "Working..." : later ? "Schedule" : "Post now"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
