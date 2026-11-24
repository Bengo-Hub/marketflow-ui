"use client";

import { DeleteVersionButton, RestoreVersionButton } from "@/components/studio/delete-version-button";
import { useState } from "react";
import { Check, Clapperboard, Film, LoaderCircle, Pencil, Play, RefreshCw, Rocket, Send, Trash2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ConfirmDialog, Field, GlassPanel, ToneBadge } from "@/components/ui-kit";
import { BoostDialog } from "@/components/studio/boost-dialog";
import { RunAdsDialog } from "@/components/studio/run-ads-dialog";
import { BrandImagesRequired } from "@/components/media/brand-images-required";
import { PublishDialog } from "@/components/studio/publish-dialog";
import { useApprove, useDiscard } from "@/hooks/use-creative";
import { useCanPublish, useIsRestricted } from "@/hooks/use-access";
import { useSubscription } from "@/hooks/use-subscription";
import {
  useApprovePlan,
  useApproveStoryboard,
  useMakeStoryboard,
  useRecomposeEndCard,
  useRedrawActor,
  useResetSettings,
  useRenderVideoAd,
  useReviseVideoAd,
  useSaveScript,
  useVideoAdQuote,
} from "@/hooks/use-video-ads";
import { kes } from "@/lib/api/billing";
import { aspectClass, IN_PROGRESS, mainAsset, STATUS_LABEL, type CreativeVersion } from "@/lib/api/creative";
import {
  frameLabel,
  SHOT_LABEL,
  VIDEO_KINDS,
  videoLengthSeconds,
  videoParts,
  type EndCard,
  type ScriptScene,
  type Shot,
  type Speaker,
  type VideoAdQuote,
  type VideoScript,
} from "@/lib/api/video-ads";
import { defaultPostCaption } from "@/lib/studio/post-caption";
import { adLeadUrl } from "@/lib/urls";

const SHOTS: Shot[] = ["presenter", "product_clip", "b_roll", "owner_footage", "end_card"];
const PRESENTER_LIMIT = 200;
/** Who reads a line of a casual ad; "Main voice" keeps the ad's single voice for it. */
const SPEAKERS: { value: Speaker; label: string }[] = [
  { value: "female", label: "Woman" },
  { value: "male", label: "Man" },
  { value: "", label: "Main voice" },
];

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
      {version.status === "failed" && parts.stage === "render" && !archived && !restricted && (
        <RetryRender briefId={briefId} versionId={version.id} />
      )}
      {version.status === "script_ready" && !archived && !restricted && <ScriptReview briefId={briefId} version={version} />}
      {canApprove && !version.approved_at && (
        <div className="flex justify-end">
          {!!version.metadata?.discarded_at && <RestoreVersionButton briefId={briefId} versionId={version.id} />}
          <DeleteVersionButton briefId={briefId} versionId={version.id} versionNo={version.version_no} />
        </div>
      )}
      {(version.status === "ready" || version.status === "approved") && (
        <Finished briefId={briefId} version={version} canApprove={canApprove} archived={archived} funnelSlug={funnelSlug} otherVideos={otherVideos} />
      )}
    </GlassPanel>
  );
}

/** A failed render runs again with the same approved script, storyboard and plan; the failed
 * attempt was refunded, so this is charged once like the first press. */
function RetryRender({ briefId, versionId }: { briefId: string; versionId: string }) {
  const render = useRenderVideoAd(briefId);
  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      <Button disabled={render.isPending} onClick={() => render.mutate(versionId)}>
        Try again
      </Button>
      <span className="text-sm text-muted-foreground">Nothing was charged for the failed try. The same approved plan is used.</span>
    </div>
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
  const redraw = useRedrawActor(briefId);
  const approvePlan = useApprovePlan(briefId);
  const recompose = useRecomposeEndCard(briefId);
  const placeAgain = useResetSettings(briefId);
  // The platform owner and subscription-exempt tenants pay no credits: they see the provider cost.
  const { isPlatformOwner, isSubscriptionExempt } = useSubscription();
  const showUSD = !!(isPlatformOwner || isSubscriptionExempt);
  const [newActor, setNewActor] = useState("");
  const render = useRenderVideoAd(briefId);
  const shape = aspectClass(version.format);
  const wide = version.format === "1920x1080";
  const discard = useDiscard(briefId);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const approved = !!parts.storyboard?.approved_at;
  const quote = useVideoAdQuote(version.id, !dirty && (!presenter || approved));
  const shots = presenter ? SHOTS : SHOTS.filter((s) => s !== "presenter");

  const change = (i: number, patch: Partial<ScriptScene>) => {
    setScenes((list) => list.map((s, j) => (j === i ? { ...s, ...patch } : s)));
    setDirty(true);
  };
  // Casual (UGC) ads may be read by a man and a woman taking turns. Every presenter scene shows
  // the same actor, so a presenter line's voice changes them all together.
  const casual = parts.delivery === "ugc";
  const setSpeaker = (i: number, speaker: Speaker) => {
    setScenes((list) => {
      const presenterLine = list[i]?.shot === "presenter";
      return list.map((s, j) => (j === i || (presenterLine && s.shot === "presenter") ? { ...s, speaker } : s));
    });
    setDirty(true);
  };
  const script: VideoScript = { ...(parts.script ?? { scenes: [] }), scenes };
  const stillFor = (id: string) => parts.storyboard?.stills.find((s) => s.scene_id === id);
  const q = quote.data;

  return (
    <div className="space-y-4">
      <BrandImagesRequired error={render.error ?? board.error} />
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
                  <img src={still.url} alt={`Storyboard for scene ${i + 1}`} className={`${shape} ${wide ? "w-40" : "w-24"} shrink-0 rounded-lg object-contain bg-muted`} />
                ) : (
                  <div className={`flex ${shape} ${wide ? "w-40" : "w-24"} shrink-0 items-center justify-center rounded-lg bg-muted text-xs text-muted-foreground`}>
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
                  {casual && s.voiceover.trim() !== "" && (
                    <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={`Scene ${i + 1} voice`}>
                      <span className="text-xs text-muted-foreground">Read by</span>
                      {SPEAKERS.map((sp) => (
                        <button
                          key={sp.value || "one"}
                          type="button"
                          role="radio"
                          aria-checked={(s.speaker ?? "") === sp.value}
                          onClick={() => setSpeaker(i, sp.value)}
                          className={`min-h-9 rounded-full border px-3 text-xs ${(s.speaker ?? "") === sp.value ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted"}`}
                        >
                          {sp.label}
                        </button>
                      ))}
                    </div>
                  )}
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
          <Field
            key={k}
            label={{ headline: "End card headline", subline: "End card line", price: "Price shown on the end card (optional)", cta: "Call to action" }[k]}
            hint={k === "price" ? "The product's own price, filled from the offering when it has one. Leave it empty to show no price. This is not what the video costs to make." : undefined}
            htmlFor={`ec-${version.id}-${k}`}
          >
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

      {!dirty && (
        <div className="space-y-2 rounded-xl border p-3">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Clapperboard className="size-4" aria-hidden /> Storyboard
          </p>
          {parts.storyboardError && <p className="text-sm text-destructive">{parts.storyboardError}</p>}
          {presenter && parts.storyboard?.actor?.url && (
            // The presenter preview: the face every presenter scene is lip-synced from.
            <figure className="flex flex-col gap-2 sm:flex-row sm:items-start">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={parts.storyboard.actor.url} alt="The presenter" className={`${shape} ${wide ? "w-56" : "w-28"} rounded-lg bg-muted object-contain`} />
              <figcaption className="text-sm text-muted-foreground">{parts.storyboard.actor.prompt}</figcaption>
            </figure>
          )}
          {!parts.storyboard ? (
            <>
              <p className="text-sm text-muted-foreground">
                Before any video is paid for, see {presenter ? "the presenter and " : ""}one picture per scene. About 1 credit, free when every scene uses your
                photos.
              </p>
              <Button variant="outline" disabled={board.isPending} onClick={() => board.mutate(version.id)}>
                {board.isPending ? "Starting..." : "Make the storyboard"}
              </Button>
            </>
          ) : approved ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="size-4 text-success" aria-hidden /> Approved. The pictures are shown beside each scene.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex flex-wrap gap-2">
                <Button disabled={approveBoard.isPending} onClick={() => approveBoard.mutate(version.id)}>
                  <Check /> Approve the storyboard
                </Button>
                <Button variant="outline" disabled={board.isPending} onClick={() => board.mutate(version.id)}>
                  Make it again
                </Button>
              </div>
              {presenter && (
                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <Field label="New presenter (optional description)" htmlFor={`actor-${version.id}`} hint="Leave empty to redraw from the same description.">
                    <Input id={`actor-${version.id}`} maxLength={300} value={newActor} onChange={(e) => setNewActor(e.target.value)} />
                  </Field>
                  <Button variant="outline" disabled={redraw.isPending} onClick={() => redraw.mutate({ id: version.id, actorPrompt: newActor.trim() })}>
                    {redraw.isPending ? "Starting..." : "Draw a new presenter"}
                  </Button>
                </div>
              )}
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
                {showUSD ? (
                  <span className="font-semibold">About {usd(q.plan?.cost_usd ?? 0)} at provider prices{q.max_video_usd ? `, ceiling ${usd(q.max_video_usd)}` : ""}</span>
                ) : (
                  <span className="font-semibold">{q.credits_needed} credits</span>
                )}
                {!showUSD && q.balance >= 0 && <span className="text-muted-foreground"> of {q.balance} left</span>}
                {!!q.plan?.cached_scenes && <span className="text-muted-foreground">. {q.plan.cached_scenes} unchanged scenes are reused for free</span>}
              </p>
              {!q.enough && q.suggested_bundle && (
                <p className="text-sm text-destructive">
                  Not enough credits: {q.shortfall} short. Buy {q.suggested_bundle.units} credits for {kes(q.suggested_bundle.price_kes)} in Billing.
                </p>
              )}
              <GenerationPlan
                quote={q}
                shape={shape}
                wide={wide}
                settings={Object.fromEntries(script.scenes.map((s) => [s.id, s.setting ?? ""]))}
                endCard={endCardPreview(version)}
              />
              {endCardPreview(version) && (
                <Button variant="ghost" size="sm" disabled={recompose.isPending} onClick={() => recompose.mutate(version.id)}>
                  <RefreshCw /> {recompose.isPending ? "Updating the end card..." : "Update the end card preview"}
                </Button>
              )}
              {!q.plan_approved && (
                <Button variant="ghost" size="sm" disabled={placeAgain.isPending} onClick={() => placeAgain.mutate(version.id)}>
                  <RefreshCw /> {placeAgain.isPending ? "Placing the scenes..." : "Place the scenes again from the address"}
                </Button>
              )}
              {q.plan_fingerprint && !q.plan_approved && (
                <Button
                  variant="outline"
                  disabled={approvePlan.isPending || (q.plan?.scenes ?? []).some((s) => s.frame === "generated" && !s.frame_url)}
                  onClick={() => approvePlan.mutate({ id: version.id, fingerprint: q.plan_fingerprint as string })}
                >
                  <Check /> {approvePlan.isPending ? "Approving..." : "Approve the generation plan"}
                </Button>
              )}
              {q.plan_approved && (
                <p className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Check className="size-4 text-success" aria-hidden /> Plan approved. Any change to the script or storyboard asks for it again.
                </p>
              )}
            </>
          )}
          <Button className="w-full sm:w-auto" disabled={render.isPending || !q || !q.enough || !q.plan_approved} onClick={() => render.mutate(version.id)}>
            <Play /> {render.isPending ? "Starting..." : q ? (showUSD ? `Render, about ${usd(q.plan?.cost_usd ?? 0)}` : `Render for ${q.credits_needed} credits`) : "Render"}
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

/**
 * The generation plan: for every scene, the first frame and the exact prompts each provider will
 * receive. The owner approves it before the render; any change to the script or storyboard makes a
 * new plan.
 */
function GenerationPlan({
  quote,
  shape,
  wide,
  settings,
  endCard,
}: {
  quote: VideoAdQuote;
  shape: string;
  wide: boolean;
  settings: Record<string, string>;
  endCard?: { scene_id: string; url: string };
}) {
  const scenes = quote.plan?.scenes ?? [];
  if (scenes.length === 0) return null;
  const cost = quote.plan?.cost_usd;
  const ceiling = quote.max_video_usd;
  const missing = scenes.some((s) => s.frame === "generated" && !s.frame_url);
  return (
    <details className="rounded-lg border p-2" open={!quote.plan_approved}>
      <summary className="cursor-pointer text-sm font-medium">Generation plan: what each scene is made from</summary>
      {missing && <p className="mt-2 text-sm text-destructive">Some scenes need a picture from the storyboard. Make the storyboard first.</p>}
      {ceiling ? (
        <p className="mt-2 text-sm text-muted-foreground">
          {typeof cost === "number" ? `Provider cost about ${usd(cost)}, ` : ""}within the {usd(ceiling)} ceiling per video. Nothing is made above it.
        </p>
      ) : null}
      <ol className="mt-2 space-y-2">
        {scenes.map((s, i) => (
          <li key={s.scene_id || i} className="flex flex-col gap-2 rounded-lg bg-muted/40 p-2 sm:flex-row">
            {s.frame_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.frame_url} alt={`First frame of scene ${i + 1}`} className={`${shape} ${wide ? "w-32" : "w-16"} shrink-0 rounded bg-muted object-contain`} />
            ) : (
              <div className={`${shape} ${wide ? "w-32" : "w-16"} shrink-0 rounded bg-muted`} />
            )}
            <div className="min-w-0 flex-1 space-y-1 text-xs">
              <p className="text-sm">
                Scene {i + 1}: {SHOT_LABEL[s.shot] ?? s.shot}. First frame: {frameLabel(s)}
                {s.cached ? ". Kept from the last version" : s.route ? `. ${s.route}${s.tier === "premium" ? " (premium)" : ""}` : ""}
              </p>
              {endCard && endCard.scene_id === s.scene_id && (
                <figure className="space-y-1">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={endCard.url} alt="The end card as it will render" className={`${shape} w-full max-w-md rounded border object-contain`} />
                  <figcaption className="text-muted-foreground">The end card as it will render: the words, your contacts and your logo are drawn by MarketFlow, never by the image model.</figcaption>
                </figure>
              )}
              {settings[s.scene_id] && (
                <p className="break-words text-muted-foreground">
                  <span className="font-medium text-foreground">Setting:</span> {settings[s.scene_id]}
                </p>
              )}
              {s.still_prompt && !s.cached && (
                <p className="break-words text-muted-foreground">
                  <span className="font-medium text-foreground">Picture prompt:</span> {s.still_prompt}
                </p>
              )}
              {s.prompt && (
                <p className="whitespace-pre-line break-words text-muted-foreground">
                  <span className="font-medium text-foreground">Video prompt:</span> {s.prompt}
                </p>
              )}
              {s.negative_prompt && (
                <p className="break-words text-muted-foreground">
                  <span className="font-medium text-foreground">Kept out:</span> {s.negative_prompt}
                </p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </details>
  );
}

/** Which voices read a finished casual ad, and why one voice read it when two were written. */
function VoicesUsed({ version }: { version: CreativeVersion }) {
  const parts = videoParts(version);
  const { female, male } = parts.voicesUsed;
  if (!female && !male && !parts.twoVoiceNote) return null;
  return (
    <p className="text-sm text-muted-foreground">
      {female && male ? `Read by two voices: ${female} and ${male}.` : null}
      {parts.twoVoiceNote ? ` ${parts.twoVoiceNote}` : null}
    </p>
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
  const [running, setRunning] = useState(false);
  // The player's measured length, so the publish dialog can check TikTok's per-account limit.
  const [measured, setMeasured] = useState<number | undefined>(undefined);
  // Post and Boost: the approving roles and the app reviewer. Changing or discarding: not the reviewer.
  const canPublish = useCanPublish();
  const restricted = useIsRestricted();
  const ready = version.status === "ready";
  const caption = [version.copy?.headline, version.copy?.subline, version.copy?.cta].filter(Boolean).join("\n");
  // A post ends with the ad's lead page, tagged so its leads show they came from this ad.
  // A pharmacy's medicine ad ends with its PPB approval line (pharmacy hand-off 2026-11-14).
  const postCaption = defaultPostCaption(
    caption,
    funnelSlug ? adLeadUrl(funnelSlug, briefId, "social", "social") : undefined,
    version.metadata as Record<string, unknown> | undefined,
  );
  return (
    <div className="space-y-3">
      <BrandImagesRequired error={revise.error} />
      {video ? (
        <video
          controls
          playsInline
          preload="metadata"
          src={video.url}
          onLoadedMetadata={(e) => setMeasured(e.currentTarget.duration)}
          className="mx-auto max-h-[70vh] w-full rounded-xl bg-black"
          aria-label={`Video ad version ${version.version_no}`}
        />
      ) : (
        <p className="text-sm text-muted-foreground">The video file is no longer stored.</p>
      )}
      <VoicesUsed version={version} />
      {!archived && (
        <div className="flex flex-wrap gap-2">
          {ready && canApprove && (
            // Run ads opens straight after approving, for the roles that can run ads.
            <Button disabled={approve.isPending} onClick={() => approve.mutate(version.id, {
                onSuccess: () => {
                  if (canPublish && video) setRunning(true);
                },
              })}>
              <Check /> Approve
            </Button>
          )}
          {version.status === "approved" && video && canPublish && (
            <Button onClick={() => setPosting(true)}>
              <Send /> Post
            </Button>
          )}
          {version.status === "approved" && video && canPublish && (
            <Button variant="outline" onClick={() => setRunning(true)}>
              <Rocket /> Run ads
            </Button>
          )}
          {/* The Meta-only boost keeps its extra choices (audience, objective, more videos). */}
          {version.status === "approved" && video && canPublish && (
            <Button variant="ghost" onClick={() => setBoosting(true)}>
              Boost on Meta only
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
      {video && posting && (
        <PublishDialog
          open={posting}
          onOpenChange={setPosting}
          assetId={video.id}
          defaultCaption={postCaption}
          videoSeconds={videoLengthSeconds(measured, videoParts(version).script)}
        />
      )}
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
      {running && <RunAdsDialog open={running} onOpenChange={setRunning} versionId={version.id} />}
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

/** "USD 1.20" */
function usd(v: number): string {
  return `USD ${v.toFixed(2)}`;
}

/** The end card preview the storyboard composed (its still with the words, contacts and logo). */
function endCardPreview(version: CreativeVersion): { scene_id: string; url: string } | undefined {
  const sb = version.metadata?.storyboard as { end_card_preview?: { scene_id?: string; url?: string } } | undefined;
  const p = sb?.end_card_preview;
  return p?.url && p.scene_id ? { scene_id: p.scene_id, url: p.url } : undefined;
}
