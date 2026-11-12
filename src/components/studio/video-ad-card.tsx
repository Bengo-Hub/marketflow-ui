"use client";

import { useState } from "react";
import { Check, Clapperboard, Film, LoaderCircle, Pencil, Play, Rocket, Send, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog, Field, GlassPanel, ToneBadge } from "@/components/ui-kit";
import { BoostDialog } from "@/components/studio/boost-dialog";
import { PublishDialog } from "@/components/studio/publish-dialog";
import { useApprove, useDiscard } from "@/hooks/use-creative";
import { useCanPublish, useIsRestricted } from "@/hooks/use-access";
import {
  useApproveStoryboard,
  useMakeStoryboard,
  useRenderVideoAd,
  useReviseVideoAd,
  useSaveScript,
  useVideoAdQuote,
} from "@/hooks/use-video-ads";
import { kes } from "@/lib/api/billing";
import { IN_PROGRESS, mainAsset, STATUS_LABEL, type CreativeVersion } from "@/lib/api/creative";
import { SHOT_LABEL, VIDEO_KINDS, videoParts, type EndCard, type ScriptScene, type Shot, type VideoScript } from "@/lib/api/video-ads";
import { adLeadUrl } from "@/lib/urls";

const SHOTS: Shot[] = ["presenter", "product_clip", "b_roll", "owner_footage", "end_card"];
const PRESENTER_LIMIT = 200;

/** One video ad version: its script, storyboard, price, progress and the finished video. */
export function VideoAdCard({
  briefId,
  version,
  canApprove,
  archived,
  funnelSlug,
  otherVideos,
}: {
  briefId: string;
  version: CreativeVersion;
  /** Other approved videos of the brief, offered beside this one when boosting. */
  otherVideos?: { assetId: string; label: string }[];
  canApprove: boolean;
  archived: boolean;
  /** The ad's own lead page; posts and boosts link to it by default. */
  funnelSlug?: string;
}) {
  const parts = videoParts(version);
  // The app reviewer does not write scripts, storyboards or renders.
  const restricted = useIsRestricted();
  const kindLabel = VIDEO_KINDS.find((k) => k.value === parts.kind)?.label ?? "Video";
  const busy = IN_PROGRESS.includes(version.status);
  const stageLabel = busy
    ? parts.stage === "storyboard"
      ? "Making the storyboard"
      : parts.stage === "render"
        ? "Making the video"
        : "Writing the script"
    : version.status === "script_ready"
      ? "Script to review"
      : STATUS_LABEL[version.status as keyof typeof STATUS_LABEL] ?? version.status;

  return (
    <GlassPanel
      title={
        <span className="flex flex-wrap items-center gap-2">
          <Film className="size-4" aria-hidden /> Video ad v{version.version_no}
          <ToneBadge>{kindLabel}</ToneBadge>
          <ToneBadge tone={version.status === "failed" ? "danger" : busy ? "warning" : "neutral"}>{stageLabel}</ToneBadge>
        </span>
      }
    >
      {busy && <Progress stage={parts.stage} />}
      {version.error && <p className="mb-3 text-sm text-destructive">{version.error}</p>}
      {version.status === "script_ready" && !archived && !restricted && <ScriptReview briefId={briefId} version={version} />}
      {(version.status === "ready" || version.status === "approved") && (
        <Finished briefId={briefId} version={version} canApprove={canApprove} archived={archived} funnelSlug={funnelSlug} otherVideos={otherVideos} />
      )}
    </GlassPanel>
  );
}

function Progress({ stage }: { stage: string }) {
  const text =
    stage === "render"
      ? "Voicing each scene, making the presenter and product scenes, then putting it together. A presenter ad takes about 5 to 10 minutes; this page updates by itself."
      : stage === "storyboard"
        ? "Drawing the presenter and one picture per scene. About a minute."
        : "The script is being written and checked. About a minute.";
  return (
    <p role="status" className="mb-3 flex gap-2 text-sm text-muted-foreground">
      <LoaderCircle className="mt-0.5 size-4 shrink-0 animate-spin" aria-hidden /> {text}
    </p>
  );
}

/** The script editor, the storyboard and the render button with its live price. */
function ScriptReview({ briefId, version }: { briefId: string; version: CreativeVersion }) {
  const parts = videoParts(version);
  const presenter = parts.kind !== "template";
  const [scenes, setScenes] = useState<ScriptScene[]>(parts.script?.scenes ?? []);
  const [card, setCard] = useState<EndCard>(parts.endCard);
  const [dirty, setDirty] = useState(false);
  const save = useSaveScript(briefId);
  const board = useMakeStoryboard(briefId);
  const approveBoard = useApproveStoryboard(briefId);
  const render = useRenderVideoAd(briefId);
  const discard = useDiscard(briefId);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const approved = !!parts.storyboard?.approved_at;
  const quote = useVideoAdQuote(version.id, !dirty && (!presenter || approved));
  const shots = presenter ? SHOTS : SHOTS.filter((s) => s !== "presenter");

  const change = (i: number, patch: Partial<ScriptScene>) => {
    setScenes((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    setDirty(true);
  };
  const script: VideoScript = { ...(parts.script ?? { scenes: [] }), scenes };
  const stillFor = (id: string) => parts.storyboard?.stills.find((s) => s.scene_id === id);
  const q = quote.data;

  return (
    <div className="space-y-4">
      {parts.findings.length > 0 && (
        <div className="rounded-xl border border-warning/40 p-3 text-sm">
          <p className="mb-1 flex items-center gap-2 font-medium">
            <TriangleAlert className="size-4 text-warning" aria-hidden /> Review notes
          </p>
          <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
            {parts.findings.map((f, i) => (
              <li key={i}>
                {f.issue}
                {f.fix ? `: ${f.fix}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}

      <ol className="space-y-3">
        {scenes.map((s, i) => {
          const still = stillFor(s.id);
          const over = s.shot === "presenter" && s.voiceover.length > PRESENTER_LIMIT;
          return (
            <li key={s.id || i} className="rounded-xl border p-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                {still?.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={still.url} alt={`Storyboard for scene ${i + 1}`} className="aspect-[9/16] w-24 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex aspect-[9/16] w-24 shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground">
                    {still?.source === "footage" ? "Your clip" : `Scene ${i + 1}`}
                  </div>
                )}
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Scene ${i + 1} shot`}>
                    {shots.map((shot) => (
                      <button
                        key={shot}
                        type="button"
                        role="radio"
                        aria-checked={s.shot === shot}
                        onClick={() => change(i, { shot })}
                        className={`min-h-9 rounded-full border px-3 text-xs ${s.shot === shot ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                      >
                        {SHOT_LABEL[shot]}
                      </button>
                    ))}
                  </div>
                  <Field label="Voice-over" htmlFor={`vo-${version.id}-${i}`} error={over ? `A presenter scene says at most ${PRESENTER_LIMIT} characters` : null}>
                    <Textarea id={`vo-${version.id}-${i}`} rows={2} value={s.voiceover} onChange={(e) => change(i, { voiceover: e.target.value })} />
                  </Field>
                  <Field label="On-screen caption" htmlFor={`cap-${version.id}-${i}`}>
                    <Input id={`cap-${version.id}-${i}`} maxLength={120} value={s.caption} onChange={(e) => change(i, { caption: e.target.value })} />
                  </Field>
                  {(presenter || s.visual) && (
                    <Field label="What is seen" htmlFor={`vis-${version.id}-${i}`}>
                      <Input id={`vis-${version.id}-${i}`} maxLength={300} value={s.visual ?? ""} onChange={(e) => change(i, { visual: e.target.value })} />
                    </Field>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {(["headline", "subline", "price", "cta"] as const).map((k) => (
          <Field key={k} label={{ headline: "End card headline", subline: "End card line", price: "Price", cta: "Call to action" }[k]} htmlFor={`ec-${version.id}-${k}`}>
            <Input
              id={`ec-${version.id}-${k}`}
              maxLength={200}
              value={card[k] ?? ""}
              onChange={(e) => {
                setCard({ ...card, [k]: e.target.value });
                setDirty(true);
              }}
            />
          </Field>
        ))}
      </div>

      {dirty && (
        <Button
          variant="outline"
          disabled={save.isPending}
          onClick={() => save.mutate({ id: version.id, script, endCard: card }, { onSuccess: () => setDirty(false) })}
        >
          <Pencil /> {save.isPending ? "Saving..." : "Save changes"}
        </Button>
      )}

      {presenter && !dirty && (
        <div className="space-y-2 rounded-xl border p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Clapperboard className="size-4" aria-hidden /> Storyboard
          </p>
          {parts.storyboardError && <p className="text-sm text-destructive">{parts.storyboardError}</p>}
          {!parts.storyboard ? (
            <>
              <p className="text-sm text-muted-foreground">Before any video is paid for, see the presenter and one picture per scene. About 1 credit.</p>
              <Button variant="outline" disabled={board.isPending} onClick={() => board.mutate(version.id)}>
                {board.isPending ? "Starting..." : "Make the storyboard"}
              </Button>
            </>
          ) : approved ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="size-4 text-success" aria-hidden /> Approved. The pictures are shown beside each scene.
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button disabled={approveBoard.isPending} onClick={() => approveBoard.mutate(version.id)}>
                <Check /> Approve the storyboard
              </Button>
              <Button variant="outline" disabled={board.isPending} onClick={() => board.mutate(version.id)}>
                Make it again
              </Button>
            </div>
          )}
        </div>
      )}

      {!dirty && (!presenter || approved) && (
        <div className="space-y-2 rounded-xl border p-3" aria-live="polite">
          {quote.isLoading && <p className="text-sm text-muted-foreground">Working out the price...</p>}
          {quote.isError && <p className="text-sm text-destructive">The price could not be worked out right now. Try again in a minute.</p>}
          {q && (
            <>
              <p className="text-sm">
                <span className="font-semibold">{q.credits_needed} credits</span>
                {q.balance >= 0 && <span className="text-muted-foreground"> of {q.balance} left</span>}
                {!!q.plan?.cached_scenes && <span className="text-muted-foreground">. {q.plan.cached_scenes} unchanged scenes are reused for free</span>}
              </p>
              {!q.enough && q.suggested_bundle && (
                <p className="text-sm text-destructive">
                  Not enough credits: {q.shortfall} short. Buy {q.suggested_bundle.units} credits for {kes(q.suggested_bundle.price_kes)} in Billing.
                </p>
              )}
            </>
          )}
          <Button className="w-full sm:w-auto" disabled={render.isPending || !q || !q.enough} onClick={() => render.mutate(version.id)}>
            <Play /> {render.isPending ? "Starting..." : q ? `Render for ${q.credits_needed} credits` : "Render"}
          </Button>
        </div>
      )}

      <Button variant="ghost" size="sm" onClick={() => setConfirmDiscard(true)}>
        <Trash2 /> Discard
      </Button>
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard this script?"
        description="The script and its storyboard are deleted. Credits already spent are not returned."
        confirmLabel="Discard"
        variant="danger"
        pending={discard.isPending}
        onConfirm={() => discard.mutate(version.id, { onSuccess: () => setConfirmDiscard(false) })}
      />
    </div>
  );
}

/** The finished video: the player, approve, change scenes, discard. */
function Finished({
  briefId,
  version,
  canApprove,
  archived,
  funnelSlug,
  otherVideos,
}: {
  briefId: string;
  version: CreativeVersion;
  canApprove: boolean;
  archived: boolean;
  funnelSlug?: string;
  otherVideos?: { assetId: string; label: string }[];
}) {
  const video = mainAsset(version);
  const approve = useApprove(briefId);
  const discard = useDiscard(briefId);
  const revise = useReviseVideoAd(briefId);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [posting, setPosting] = useState(false);
  const [boosting, setBoosting] = useState(false);
  // Post and Boost: the approving roles and the app reviewer. Changing or discarding: not the reviewer.
  const canPublish = useCanPublish();
  const restricted = useIsRestricted();
  const ready = version.status === "ready";
  const caption = [version.copy?.headline, version.copy?.subline, version.copy?.cta].filter(Boolean).join("\n");
  // A post ends with the ad's lead page, tagged so its leads show they came from this ad.
  const postCaption = funnelSlug ? `${caption}\n\n${adLeadUrl(funnelSlug, briefId, "social", "social")}` : caption;
  return (
    <div className="space-y-3">
      {video ? (
        <video
          controls
          playsInline
          preload="metadata"
          src={video.url}
          className="mx-auto max-h-[70vh] w-full rounded-xl bg-black"
          aria-label={`Video ad version ${version.version_no}`}
        />
      ) : (
        <p className="text-sm text-muted-foreground">The video file is no longer stored.</p>
      )}
      {!archived && (
        <div className="flex flex-wrap gap-2">
          {ready && canApprove && (
            <Button disabled={approve.isPending} onClick={() => approve.mutate(version.id)}>
              <Check /> Approve
            </Button>
          )}
          {version.status === "approved" && video && canPublish && (
            <Button onClick={() => setPosting(true)}>
              <Send /> Post
            </Button>
          )}
          {version.status === "approved" && video && canPublish && (
            <Button variant="outline" onClick={() => setBoosting(true)}>
              <Rocket /> Boost
            </Button>
          )}
          {!restricted && (
            <Button variant="outline" disabled={revise.isPending} onClick={() => revise.mutate(version.id)}>
              <Pencil /> Change a scene
            </Button>
          )}
          {ready && !restricted && (
            <Button variant="ghost" onClick={() => setConfirmDiscard(true)}>
              <Trash2 /> Discard
            </Button>
          )}
        </div>
      )}
      {video && posting && <PublishDialog open={posting} onOpenChange={setPosting} assetId={video.id} defaultCaption={postCaption} />}
      {video && boosting && (
        <BoostDialog
          open={boosting}
          onOpenChange={setBoosting}
          assetId={video.id}
          defaultText={caption}
          otherVideos={otherVideos}
          defaultLink={funnelSlug ? adLeadUrl(funnelSlug, briefId, "facebook", "paid") : undefined}
        />
      )}
      <ConfirmDialog
        open={confirmDiscard}
        onOpenChange={setConfirmDiscard}
        title="Discard this video?"
        description="The video and its scene files are deleted now."
        confirmLabel="Discard"
        variant="danger"
        pending={discard.isPending}
        onConfirm={() => discard.mutate(version.id, { onSuccess: () => setConfirmDiscard(false) })}
      />
    </div>
  );
}
