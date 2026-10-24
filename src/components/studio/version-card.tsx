"use client";

import { useState } from "react";
import { Check, Clock, Copy, Download, Film, MoreVertical, PenLine, Repeat2, Share2, TriangleAlert, X } from "lucide-react";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CapsuleTabs, ConfirmDialog, Field, ToneBadge, humanize, type Tone } from "@/components/ui-kit";
import { useApprove, useDiscard, useExtend, useMotion, useRevise } from "@/hooks/use-creative";
import { apiErrorMessage } from "@/lib/api/errors";
import { creativeApi, expiresAt, IN_PROGRESS, mainAsset, STATUS_LABEL, type CreativeVersion, type Tier, type VersionStatus } from "@/lib/api/creative";
import { API_URL } from "@/lib/urls";
import { cn } from "@/lib/utils";

const TONE: Record<VersionStatus, Tone> = {
  queued: "warning",
  rendering: "warning",
  ready: "info",
  failed: "danger",
  approved: "success",
  rejected: "neutral",
  superseded: "neutral",
};

const ASPECT: Record<string, string> = { "1080x1080": "aspect-square", "1080x1350": "aspect-[4/5]", "1080x1920": "aspect-[9/16]" };
const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

type Open = "revise" | "motion" | "share" | "discard" | null;

export function VersionCard({
  briefId,
  version: v,
  canApprove,
  archived,
  onRemake,
}: {
  briefId: string;
  version: CreativeVersion;
  canApprove: boolean;
  archived: boolean;
  onRemake: () => void;
}) {
  const [open, setOpen] = useState<Open>(null);
  const approve = useApprove(briefId);
  const discard = useDiscard(briefId);
  const extend = useExtend(briefId);
  const asset = mainAsset(v);
  const busy = IN_PROGRESS.includes(v.status);
  const finished = v.status === "ready" || v.status === "approved";
  const isPoster = v.kind === "poster";
  const expires = expiresAt(v);
  const restricted = v.metadata?.restricted_categories ?? [];
  const extended = !!v.metadata?.extended_at;
  const editable = !archived && isPoster && (finished || v.status === "superseded");

  return (
    <article className="glass flex min-w-0 flex-col overflow-hidden rounded-[1.25rem]">
      <div className={cn("relative w-full bg-muted", ASPECT[v.format] ?? "aspect-[4/5]", v.format === "1080x1920" && "max-h-[32rem]")}>
        {asset && finished ? (
          v.kind === "video" ? (
            <video src={asset.url} controls playsInline loop className="size-full object-contain" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={asset.url} alt={v.copy?.headline || `Poster version ${v.version_no}`} className="size-full object-contain" loading="lazy" />
          )
        ) : asset && !busy ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={asset.url} alt="" className="size-full object-contain opacity-50" loading="lazy" />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground">
            {busy ? (
              <>
                <span className="size-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary motion-reduce:animate-none" aria-hidden />
                {v.kind === "video" ? "Making the motion poster. This takes a few minutes." : "Making the poster. About a minute."}
              </>
            ) : v.status === "failed" ? (
              <>
                <TriangleAlert className="size-5 text-destructive" />
                {v.error || "This poster could not be made."}
              </>
            ) : (
              "The files of this version are gone."
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-display text-sm font-semibold">Version {v.version_no}</span>
          {v.kind === "video" && <ToneBadge tone="primary">Motion</ToneBadge>}
          {v.tier === "premium" && <ToneBadge>Premium</ToneBadge>}
          <ToneBadge tone={TONE[v.status]} className="ml-auto">
            {STATUS_LABEL[v.status] ?? humanize(v.status)}
          </ToneBadge>
        </div>

        {v.copy?.headline && <p className="line-clamp-2 text-sm text-foreground">{v.copy.headline}</p>}

        {restricted.length > 0 && (
          <p className="flex gap-2 rounded-xl bg-warning/10 px-3 py-2 text-xs text-warning">
            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
            Mentions {restricted.map(humanize).join(", ").toLowerCase()}. Ad platforms review these closely; check the words before you approve.
          </p>
        )}

        <p className="text-xs text-muted-foreground">
          {v.status === "approved" && v.approved_at ? `Approved ${when.format(new Date(v.approved_at))}. Kept.` : null}
          {v.status !== "approved" && expires ? `Files kept until ${when.format(new Date(expires))}.` : null}
          {v.credits > 0 && ` ${v.credits} credits.`}
          {v.metadata?.recompose && " Words changed, no charge."}
        </p>

        <div className="mt-auto flex flex-wrap items-center gap-2">
          {v.status === "ready" && canApprove && !archived && (
            <Button size="sm" disabled={approve.isPending} onClick={() => approve.mutate(v.id)}>
              <Check /> Approve
            </Button>
          )}
          {(v.status === "ready" || v.status === "failed") && !archived && (
            <Button size="sm" variant="outline" onClick={() => setOpen("discard")}>
              <X /> Discard
            </Button>
          )}
          {asset && finished && (
            <a href={asset.url} download target="_blank" rel="noreferrer" className={buttonVariants({ size: "sm", variant: "ghost" })}>
              <Download /> Download
            </a>
          )}
          {(finished || editable) && (
            <DropdownMenu>
              <DropdownMenuTrigger aria-label={`More for version ${v.version_no}`} className="ml-auto inline-flex h-10 w-10 items-center justify-center rounded-xl hover:bg-accent">
                <MoreVertical className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {editable && (
                  <DropdownMenuItem onClick={() => setOpen("revise")}>
                    <PenLine /> Change the words
                  </DropdownMenuItem>
                )}
                {editable && (
                  <DropdownMenuItem onClick={() => setOpen("motion")}>
                    <Film /> Make it move
                  </DropdownMenuItem>
                )}
                {isPoster && !archived && (
                  <DropdownMenuItem onClick={onRemake}>
                    <Repeat2 /> New poster like this
                  </DropdownMenuItem>
                )}
                {finished && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setOpen("share")}>
                      <Share2 /> Share for review
                    </DropdownMenuItem>
                  </>
                )}
                {v.status === "ready" && !extended && !archived && (
                  <DropdownMenuItem disabled={extend.isPending} onClick={() => extend.mutate(v.id)}>
                    <Clock /> Keep for 7 days
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={open === "discard"}
        onOpenChange={(o) => !o && setOpen(null)}
        title={`Discard version ${v.version_no}?`}
        description="Its files are deleted within the hour. Credits already used are not returned."
        confirmLabel="Discard"
        pending={discard.isPending}
        onConfirm={() => discard.mutate(v.id, { onSuccess: () => setOpen(null) })}
      />

      <Dialog open={open === "revise"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Change the words</DialogTitle>
          </DialogHeader>
          {open === "revise" && <ReviseForm briefId={briefId} version={v} onDone={() => setOpen(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={open === "motion"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Make it move</DialogTitle>
          </DialogHeader>
          {open === "motion" && <MotionForm briefId={briefId} version={v} onDone={() => setOpen(null)} />}
        </DialogContent>
      </Dialog>

      <Dialog open={open === "share"} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share for review</DialogTitle>
          </DialogHeader>
          {open === "share" && <ShareForm version={v} onDone={() => setOpen(null)} />}
        </DialogContent>
      </Dialog>
    </article>
  );
}

function ReviseForm({ briefId, version: v, onDone }: { briefId: string; version: CreativeVersion; onDone: () => void }) {
  const revise = useRevise(briefId);
  const [words, setWords] = useState({
    headline: v.copy?.headline ?? "",
    subline: v.copy?.subline ?? "",
    price: v.copy?.price ?? "",
    cta: v.copy?.cta ?? "",
  });
  const set = (k: keyof typeof words) => (e: React.ChangeEvent<HTMLInputElement>) => setWords((w) => ({ ...w, [k]: e.target.value }));
  return (
    <>
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">Same picture, new words. Free, and ready in a few seconds as a new version.</p>
        <Field label="Headline" htmlFor="rv-h"><Input id="rv-h" value={words.headline} maxLength={200} onChange={set("headline")} /></Field>
        <Field label="Second line" htmlFor="rv-s"><Input id="rv-s" value={words.subline} maxLength={200} onChange={set("subline")} /></Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Price" htmlFor="rv-p"><Input id="rv-p" value={words.price} maxLength={200} onChange={set("price")} /></Field>
          <Field label="Button text" htmlFor="rv-c"><Input id="rv-c" value={words.cta} maxLength={200} onChange={set("cta")} /></Field>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button
          disabled={revise.isPending}
          onClick={() => revise.mutate({ id: v.id, data: Object.fromEntries(Object.entries(words).map(([k, s]) => [k, s.trim()])) }, { onSuccess: onDone })}
        >
          {revise.isPending ? "Saving..." : "Make new version"}
        </Button>
      </DialogFooter>
    </>
  );
}

function MotionForm({ briefId, version: v, onDone }: { briefId: string; version: CreativeVersion; onDone: () => void }) {
  const motion = useMotion(briefId);
  const [prompt, setPrompt] = useState("");
  const [seconds, setSeconds] = useState("5");
  const [tier, setTier] = useState<Tier>("standard");
  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">A short clip of version {v.version_no} for Reels, Stories and Status. It takes a few minutes and uses AI credits.</p>
        <Field label="Movement" htmlFor="mo-p" hint="Optional. For example: slow push in, steam rising from the cup.">
          <Textarea id="mo-p" rows={2} value={prompt} maxLength={500} onChange={(e) => setPrompt(e.target.value)} />
        </Field>
        <Field label="Length">
          <CapsuleTabs label="Length in seconds" value={seconds} onChange={setSeconds} options={["4", "5", "8", "10"].map((s) => ({ value: s, label: `${s} s` }))} />
        </Field>
        <Field label="Quality">
          <CapsuleTabs label="Quality" value={tier} onChange={setTier} options={[{ value: "standard", label: "Standard" }, { value: "premium", label: "Premium" }]} />
        </Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button disabled={motion.isPending} onClick={() => motion.mutate({ id: v.id, data: { prompt: prompt.trim() || undefined, seconds: Number(seconds), tier } }, { onSuccess: onDone })}>
          {motion.isPending ? "Starting..." : "Make motion poster"}
        </Button>
      </DialogFooter>
    </>
  );
}

const LIFETIMES = [
  { value: "24", label: "1 day" },
  { value: "72", label: "3 days" },
  { value: "168", label: "7 days" },
];

function ShareForm({ version: v, onDone }: { version: CreativeVersion; onDone: () => void }) {
  const [hours, setHours] = useState("72");
  const link = useMutation({
    mutationFn: () => creativeApi.reviewLink(v.id, Number(hours)),
    onError: (e) => toast.error(apiErrorMessage(e, "Could not make the link")),
  });
  const revoke = useMutation({
    mutationFn: () => creativeApi.revokeReviewLinks(v.id),
    onSuccess: () => {
      toast.success("Review links turned off");
      link.reset();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not turn the links off")),
  });
  const url = link.data ? `${API_URL}${link.data.path}` : "";
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed. Select the link and copy it.");
    }
  };
  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Anyone with the link can see this version without signing in, until it expires or you turn it off.</p>
        <Field label="Link works for">
          <CapsuleTabs label="Link lifetime" value={hours} onChange={(h) => { setHours(h); link.reset(); }} options={LIFETIMES} />
        </Field>
        {url && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input readOnly value={url} aria-label="Review link" onFocus={(e) => e.target.select()} />
              <Button variant="outline" size="icon" aria-label="Copy link" onClick={copy}><Copy /></Button>
            </div>
            <p className="text-xs text-muted-foreground">Expires {when.format(new Date(link.data!.expires_at))}.</p>
          </div>
        )}
      </div>
      <DialogFooter className="sm:justify-between">
        <Button variant="ghost" disabled={revoke.isPending} onClick={() => revoke.mutate()}>Turn off all links</Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onDone}>Close</Button>
          {!url && <Button disabled={link.isPending} onClick={() => link.mutate()}>{link.isPending ? "Making..." : "Make link"}</Button>}
        </div>
      </DialogFooter>
    </>
  );
}
