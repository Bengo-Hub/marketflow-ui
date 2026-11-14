"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Ban, Bot, Play, Plus, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { EmptyState, ErrorState, Field, GlassPanel, PageHeader, ToneBadge, type Tone } from "@/components/ui-kit";
import { useCanApprove, useOfferingSearch } from "@/hooks/use-creative";
import { usePublishAccounts } from "@/hooks/use-publishing";
import { autopilotApi, WEEKDAYS, type AutopilotAgent, type AutopilotConfig, type AutopilotPost } from "@/lib/api/autopilot";
import type { Offering } from "@/lib/api/creative";
import { apiErrorMessage } from "@/lib/api/errors";
import {
  canOfferVetoWindow,
  canSaveVetoWindow,
  clampVetoHours,
  countdown,
  isCancellable,
  openPosts,
  postStateLabel,
  type ApprovalMode,
} from "@/lib/studio/veto-window";

const KEY = ["autopilot-agents"];
const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });
const inputClass = "min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm";

/** The brief keeps a snapshot of the offering; the catalogue stays its owner. */
function snapshot(o: Offering): Record<string, unknown> {
  const { source, source_id, type, name, sku, description, price, photo_urls } = o;
  return Object.fromEntries(Object.entries({ source, source_id, type, name, sku, description, price, photo_urls }).filter(([, v]) => v !== undefined && v !== ""));
}

export default function AutopilotPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const agents = useQuery({ queryKey: KEY, queryFn: autopilotApi.list });
  const templates = useQuery({ queryKey: ["agent-templates"], queryFn: autopilotApi.templates, retry: false });
  const refresh = () => void qc.invalidateQueries({ queryKey: KEY });
  const create = useMutation({
    mutationFn: () => autopilotApi.create("Weekly ads"),
    onSuccess: (a) => {
      // The agent is an autopilot once its settings are saved, so it opens straight away.
      setDraft(a);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not create the agent")),
  });
  const hire = useMutation({
    mutationFn: autopilotApi.hire,
    onSuccess: (a) => {
      toast.success("Hired. Check its settings, then switch it on.");
      setDraft(a);
      refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not hire the template")),
  });
  const [draft, setDraft] = useState<AutopilotAgent | null>(null);
  const list = agents.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Bot />}
        title="Ad autopilot"
        description="An agent drafts ads for your products on a schedule. By default nothing is posted until you approve it in the Studio. On plans that include it, an agent can post after a veto window you can cancel. Paid boosts always wait for you."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/${orgSlug}/studio`} className={buttonVariants({ variant: "outline" })}>
              Back to Studio
            </Link>
            <Button disabled={create.isPending} onClick={() => create.mutate()}>
              <Plus /> New agent
            </Button>
          </div>
        }
      />

      {draft && <Settings key={draft.id} agent={draft} onDone={() => { setDraft(null); refresh(); }} />}

      <ScheduledPosts />

      {agents.isError ? (
        <ErrorState message={apiErrorMessage(agents.error, "Could not load your agents.")} onRetry={() => void agents.refetch()} />
      ) : agents.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : list.length === 0 && !draft ? (
        <EmptyState icon={<Bot />} title="No ad agents yet" description="Create one, or hire a ready-made agent below." />
      ) : (
        <div className="space-y-3">
          {list.map((a) => (
            <AgentCard key={a.id} agent={a} onEdit={() => setDraft(a)} onChange={refresh} />
          ))}
        </div>
      )}

      {(templates.data?.length ?? 0) > 0 && (
        <GlassPanel title="Ready-made agents">
          <div className="grid gap-3 sm:grid-cols-2">
            {templates.data?.map((t) => (
              <div key={t.id} className="flex flex-col gap-2 rounded-lg border border-border p-3">
                <p className="text-sm font-medium">{t.name}</p>
                <p className="flex-1 text-sm text-muted-foreground">{t.description}</p>
                <Button size="sm" variant="outline" disabled={hire.isPending} onClick={() => hire.mutate(t.id)}>
                  Hire
                </Button>
              </div>
            ))}
          </div>
        </GlassPanel>
      )}
    </div>
  );
}

const postTone: Record<string, Tone> = { scheduled: "warning", active: "info", held: "primary", vetoed: "neutral", released: "success", failed: "danger" };

/** The clock for the countdowns, ticking each half minute. */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  return now;
}

/**
 * Posts the agents make in veto-window mode: what is being made, what is scheduled and when, with
 * a Cancel button while the window is open. A cancel stops the post; the video stays in the Studio.
 */
function ScheduledPosts() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const now = useNow();
  // Owner 2026-11-14: the approving roles cancel (and the emailed link); members see the countdown only.
  const canCancel = useCanApprove();
  const posts = useQuery({ queryKey: [...KEY, "posts"], queryFn: () => autopilotApi.posts(), refetchInterval: 60_000 });
  const veto = useMutation({
    mutationFn: (p: AutopilotPost) => autopilotApi.veto(p.version_id),
    onSuccess: (r) => {
      toast.success(r.message || "Cancelled. Nothing will be posted.");
      void qc.invalidateQueries({ queryKey: [...KEY, "posts"] });
    },
    onError: (e) => {
      toast.error(apiErrorMessage(e, "Could not cancel the post"));
      void qc.invalidateQueries({ queryKey: [...KEY, "posts"] });
    },
  });
  const open = openPosts(posts.data ?? []);
  if (posts.isError || open.length === 0) return null;
  return (
    <GlassPanel title="Posts the agents will make">
      <ul className="space-y-3">
        {open.map((p) => {
          const left = countdown(p.publish_at, now);
          const places = [...new Set((p.jobs ?? []).map((j) => j.platform))].join(", ");
          return (
            <li key={p.version_id} className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border p-3">
              <div className="min-w-0 space-y-1 text-sm">
                <p className="font-medium">
                  {p.offering}
                  {p.agent_name && <span className="font-normal text-muted-foreground"> by {p.agent_name}</span>}
                </p>
                {p.state === "scheduled" && p.publish_at && (
                  <p className="text-muted-foreground">
                    Posts to {places || "your accounts"} on {when.format(new Date(p.publish_at))}
                    {left && <span className="font-medium text-foreground"> ({left === "due now" ? "due now" : `in ${left}`})</span>}
                  </p>
                )}
                {p.state === "active" && <p className="text-muted-foreground">The agent is making the video. You get an email before anything is posted.</p>}
                {p.state === "held" && p.reason && <p className="text-muted-foreground">It waits for you because {p.reason}.</p>}
                {p.caption && <p className="line-clamp-2 text-xs text-muted-foreground">{p.caption}</p>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <ToneBadge tone={postTone[p.state] ?? "neutral"}>{postStateLabel(p.state)}</ToneBadge>
                <Link href={`/${orgSlug}/studio/${p.brief_id}`} className={buttonVariants({ size: "sm", variant: "ghost" })}>
                  Open
                </Link>
                {canCancel && isCancellable(p, now) && (
                  <Button size="sm" variant="outline" disabled={veto.isPending} onClick={() => veto.mutate(p)}>
                    <Ban /> Cancel this post
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </GlassPanel>
  );
}

/** What the next run would make and what a month can cost. It makes and charges nothing. */
function DryRunPreview({ agentId }: { agentId: string }) {
  const preview = useQuery({ queryKey: [...KEY, agentId, "dry-run"], queryFn: () => autopilotApi.dryRun(agentId), staleTime: 60_000 });
  if (preview.isLoading) return <p className="text-sm text-muted-foreground">Working out the next run.</p>;
  if (preview.isError) return <ErrorState message={apiErrorMessage(preview.error, "Could not preview this agent.")} onRetry={() => void preview.refetch()} />;
  const d = preview.data;
  if (!d) return null;
  return (
    <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
      <p>
        Next draft: <span className="font-medium">{d.offering}</span>, in {d.language === "sw" ? "Swahili" : "English"}.
      </p>
      {d.credits_known ? (
        <>
          <p className="text-muted-foreground">
            Each draft costs {d.script_credits} credit{d.script_credits === 1 ? "" : "s"}. Rendering one into a video costs about {d.render_credits} more, and only when you choose to.
          </p>
          <p className="text-muted-foreground">
            In a month of up to {d.runs_per_month} runs: {d.monthly_draft_credits} credits for drafts, or {d.monthly_full_credits} if you render them all. Your ceiling of {d.credit_ceiling} covers {d.drafts_within_ceiling} draft{d.drafts_within_ceiling === 1 ? "" : "s"}, or {d.ads_within_ceiling} rendered ad{d.ads_within_ceiling === 1 ? "" : "s"}.
          </p>
          {d.balance >= 0 && <p className="text-muted-foreground">Your balance is {d.balance} credits.</p>}
        </>
      ) : (
        <p className="text-muted-foreground">Credit prices are not available right now. Your ceiling of {d.credit_ceiling} credits a month still applies.</p>
      )}
    </div>
  );
}

function AgentCard({ agent: a, onEdit, onChange }: { agent: AutopilotAgent; onEdit: () => void; onChange: () => void }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const cfg = a.metadata?.autopilot;
  const offerings = a.metadata?.autopilot_offerings ?? [];
  const latest = useQuery({ queryKey: [...KEY, a.id, "latest-run"], queryFn: () => autopilotApi.latestRun(a.id), enabled: !!cfg });
  const versions = a.metadata?.versions ?? [];
  const setActive = useMutation({
    mutationFn: (on: boolean) => autopilotApi.setActive(a.id, on),
    onSuccess: (_d, on) => {
      toast.success(on ? "Agent switched on" : "Agent switched off");
      onChange();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not change the agent")),
  });
  const run = useMutation({
    mutationFn: () => autopilotApi.runNow(a.id),
    onSuccess: () => toast.success("Drafting now. You will get an email when it is ready."),
    onError: (e) => toast.error(apiErrorMessage(e, "Could not start the agent")),
  });
  const rollback = useMutation({
    mutationFn: (v: number) => autopilotApi.rollback(a.id, v),
    onSuccess: () => {
      toast.success("Earlier settings restored");
      onChange();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not restore the settings")),
  });
  const [previewing, setPreviewing] = useState(false);
  const previous = versions.slice(0, -1).slice(-3).reverse();
  return (
    <GlassPanel>
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium">{a.name}</p>
            {cfg && (
              <p className="mt-1 text-sm text-muted-foreground">
                {cfg.cadence === "weekly" ? `Every ${WEEKDAYS[cfg.weekday]}` : "Every day"} at {cfg.time}, {offerings.length} product{offerings.length === 1 ? "" : "s"}, up to {cfg.monthly_credit_ceiling} credits a month
              </p>
            )}
            {cfg && (
              <p className="mt-1 text-xs text-muted-foreground">
                {cfg.approval_mode === "auto_publish"
                  ? `Posts a finished video ${cfg.veto_hours ?? 4} hours after your heads-up email, unless you cancel it.`
                  : "Waits for your approval of each ad."}
              </p>
            )}
            {a.last_run_at && <p className="mt-1 text-xs text-muted-foreground">Last run {when.format(new Date(a.last_run_at))}</p>}
            {latest.data?.status === "skipped" && (
              <p className="mt-1 text-xs text-muted-foreground">
                The last draft was skipped.{" "}
                {latest.data.trace?.skip === "credits" ? (
                  <>
                    Your AI credits are low. <Link href={`/${orgSlug}/settings/billing`} className="font-medium text-primary hover:underline">Buy credits</Link> and it runs again on its next schedule.
                  </>
                ) : (
                  "It runs again on its next schedule."
                )}
              </p>
            )}
          </div>
          <Switch checked={a.is_active} disabled={setActive.isPending || !cfg} onCheckedChange={(v: boolean) => setActive.mutate(v)} aria-label={`Switch ${a.name} on or off`} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" variant="outline" disabled={run.isPending || !cfg} onClick={() => run.mutate()}>
            <Play /> Draft one now
          </Button>
          {!cfg && <span className="text-xs text-muted-foreground">Open Settings to choose products first.</span>}
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Settings
          </Button>
          {cfg && (
            <Button size="sm" variant="ghost" aria-expanded={previewing} onClick={() => setPreviewing((v) => !v)}>
              {previewing ? "Hide preview" : "Preview next run"}
            </Button>
          )}
          {a.is_active && <ToneBadge tone="success">On</ToneBadge>}
        </div>
        {previewing && <DryRunPreview agentId={a.id} />}
        {previous.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span>Earlier settings:</span>
            {previous.map((v) => (
              <Button key={v.version} size="sm" variant="ghost" disabled={rollback.isPending} onClick={() => rollback.mutate(v.version)}>
                <RotateCcw /> {when.format(new Date(v.saved_at))}
              </Button>
            ))}
          </div>
        )}
      </div>
    </GlassPanel>
  );
}

function Settings({ agent, onDone }: { agent: AutopilotAgent; onDone: () => void }) {
  const cfg = agent.metadata?.autopilot;
  const catalogue = useOfferingSearch("");
  const accounts = usePublishAccounts();
  const [picked, setPicked] = useState<Array<Record<string, unknown>>>(agent.metadata?.autopilot_offerings ?? []);
  const [cadence, setCadence] = useState<"daily" | "weekly">(cfg?.cadence ?? "weekly");
  const [weekday, setWeekday] = useState(cfg?.weekday ?? 1);
  const [time, setTime] = useState(cfg?.time ?? "09:00");
  const [objective, setObjective] = useState<AutopilotConfig["objective"]>(cfg?.objective ?? "whatsapp");
  const [credits, setCredits] = useState(cfg?.monthly_credit_ceiling ?? 100);
  const [newItems, setNewItems] = useState(cfg?.new_item_drafts ?? false);
  const [acctIDs, setAcctIDs] = useState<string[]>(cfg?.connected_account_ids ?? []);
  const [mode, setMode] = useState<ApprovalMode>(cfg?.approval_mode ?? "approve_each");
  const [vetoHours, setVetoHours] = useState<number | null>(cfg?.veto_hours ?? null);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const list = accounts.data ?? [];
  const autoPublish = useQuery({ queryKey: [...KEY, "auto-publish"], queryFn: autopilotApi.autoPublish, retry: false });
  const veto = autoPublish.data;
  const hours = clampVetoHours(vetoHours ?? veto?.default_veto_hours ?? 4, veto);
  const vetoBlocked = mode === "auto_publish" && !canSaveVetoWindow(veto, acceptTerms);

  const save = useMutation({
    mutationFn: async () => {
      // The terms are accepted first, so the save that follows is allowed.
      if (mode === "auto_publish" && acceptTerms && !veto?.terms_accepted) {
        await autopilotApi.setAutoPublish({ accept_terms: true });
      }
      const chosen = list.filter((a) => acctIDs.includes(a.id));
      return autopilotApi.save(
        agent.id,
        {
          offering_ids: picked.map((o) => String(o.source_id)),
          objective,
          new_item_drafts: newItems,
          languages: cfg?.languages ?? ["en"],
          video_tiers: cfg?.video_tiers ?? ["template"],
          cadence,
          weekday,
          time,
          platforms: [...new Set(chosen.map((a) => a.platform))],
          connected_account_ids: acctIDs,
          monthly_credit_ceiling: credits,
          approval_mode: mode,
          ...(mode === "auto_publish" ? { veto_hours: hours } : {}),
        },
        picked,
      );
    },
    onSuccess: () => {
      toast.success("Settings saved. Switch the agent on when you are ready.");
      onDone();
    },
    onError: (e) => setError(apiErrorMessage(e, "Could not save the settings")),
  });

  const togglePick = (o: Offering, on: boolean) =>
    setPicked((p) => (on ? [...p, snapshot(o)] : p.filter((x) => x.source_id !== o.source_id)));

  return (
    <GlassPanel title={`Settings for ${agent.name}`}>
      <div className="space-y-4">
        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Products to advertise, in turn</legend>
          {catalogue.isLoading && <p className="text-sm text-muted-foreground">Loading your catalogue...</p>}
          {(catalogue.data ?? []).map((o) => {
            const hasPhoto = (o.photo_urls?.length ?? 0) > 0;
            return (
              <label key={`${o.source}:${o.source_id}`} className="flex min-h-11 items-center gap-3 text-sm has-[:disabled]:opacity-60">
                <Checkbox
                  checked={picked.some((x) => x.source_id === o.source_id)}
                  disabled={!hasPhoto}
                  onCheckedChange={(on) => togglePick(o, on === true)}
                  aria-label={o.name}
                />
                <span className="flex-1">{o.name}</span>
                {!hasPhoto && <span className="text-xs text-muted-foreground">Add a photo first</span>}
              </label>
            );
          })}
        </fieldset>

        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="How often" htmlFor="ap-cadence">
            <select id="ap-cadence" className={inputClass} value={cadence} onChange={(e) => setCadence(e.target.value as "daily" | "weekly")}>
              <option value="weekly">Weekly</option>
              <option value="daily">Daily</option>
            </select>
          </Field>
          {cadence === "weekly" && (
            <Field label="Day" htmlFor="ap-day">
              <select id="ap-day" className={inputClass} value={weekday} onChange={(e) => setWeekday(Number(e.target.value))}>
                {WEEKDAYS.map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Time" htmlFor="ap-time">
            <Input id="ap-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="What the ads ask people to do" htmlFor="ap-objective">
            <select id="ap-objective" className={inputClass} value={objective} onChange={(e) => setObjective(e.target.value as AutopilotConfig["objective"])}>
              <option value="whatsapp">Message on WhatsApp</option>
              <option value="leads">Fill a form</option>
              <option value="traffic">Visit a link</option>
            </select>
          </Field>
          <Field label="Most AI credits a month" htmlFor="ap-credits" hint="The agent stops drafting for the month once it reaches this.">
            <Input id="ap-credits" type="number" min={1} max={5000} value={credits} onChange={(e) => setCredits(Number(e.target.value))} />
          </Field>
        </div>

        <label className="flex min-h-11 items-center gap-3 text-sm">
          <Checkbox checked={newItems} onCheckedChange={(on) => setNewItems(on === true)} aria-label="Draft an ad when a new product is added" />
          <span>
            Draft an ad when a new product is added
            <span className="block text-xs text-muted-foreground">At most one extra draft a day, only for products with a photo. Each draft uses credits and counts toward your monthly limit.</span>
          </span>
        </label>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Where approved ads will go</legend>
          {accounts.isSuccess && list.length === 0 && <p className="text-sm text-muted-foreground">No page or channel is connected yet.</p>}
          {list.map((a) => (
            <label key={a.id} className="flex min-h-11 items-center gap-3 text-sm">
              <Checkbox
                checked={acctIDs.includes(a.id)}
                onCheckedChange={(on) => setAcctIDs((p) => (on === true ? [...p, a.id] : p.filter((x) => x !== a.id)))}
                aria-label={a.display_name}
              />
              {a.display_name}
            </label>
          ))}
        </fieldset>

        <fieldset className="space-y-2">
          <legend className="text-sm font-medium">Before a video is posted</legend>
          <label className="flex min-h-11 items-start gap-3 text-sm">
            <input type="radio" name="ap-mode" className="mt-1" checked={mode === "approve_each"} onChange={() => setMode("approve_each")} />
            <span>
              Wait for my approval of each ad
              <span className="block text-xs text-muted-foreground">Drafts wait in the Studio. Nothing is posted until you approve it.</span>
            </span>
          </label>
          <label className="flex min-h-11 items-start gap-3 text-sm has-[:disabled]:opacity-60">
            <input
              type="radio"
              name="ap-mode"
              className="mt-1"
              checked={mode === "auto_publish"}
              disabled={!canOfferVetoWindow(veto)}
              onChange={() => setMode("auto_publish")}
            />
            <span>
              Publish after a veto window
              <span className="block text-xs text-muted-foreground">
                {canOfferVetoWindow(veto)
                  ? "The agent finishes the video and emails you what it will post, where and when, with a link to cancel. It posts when the window ends unless you cancel. Paid boosts always wait for your approval."
                  : "Not included in your plan."}
              </span>
            </span>
          </label>
          {mode === "auto_publish" && veto && (
            <div className="space-y-3 rounded-lg border border-border p-3">
              <Field label="Veto window in hours" htmlFor="ap-veto" hint={`${veto.min_veto_hours} to ${veto.max_veto_hours} hours. The default is ${veto.default_veto_hours}.`}>
                <Input
                  id="ap-veto"
                  type="number"
                  min={veto.min_veto_hours}
                  max={veto.max_veto_hours}
                  value={vetoHours ?? veto.default_veto_hours}
                  onChange={(e) => setVetoHours(Number(e.target.value))}
                  onBlur={() => setVetoHours(hours)}
                />
              </Field>
              {!veto.terms_accepted && (
                <div className="space-y-2 text-sm">
                  <p className="font-medium">Autopilot terms</p>
                  <ul className="list-disc space-y-1 pl-5 text-muted-foreground">
                    {veto.terms.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                  <label className="flex min-h-11 items-center gap-3">
                    <Checkbox checked={acceptTerms} onCheckedChange={(on) => setAcceptTerms(on === true)} aria-label="I accept the Autopilot terms" />
                    I accept the Autopilot terms
                  </label>
                </div>
              )}
            </div>
          )}
        </fieldset>

        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <div className="flex flex-wrap gap-2">
          <Button disabled={save.isPending || picked.length === 0 || acctIDs.length === 0 || vetoBlocked} onClick={() => { setError(null); save.mutate(); }}>
            {save.isPending ? "Saving..." : "Save settings"}
          </Button>
          <Button variant="ghost" onClick={onDone}>Cancel</Button>
        </div>
      </div>
    </GlassPanel>
  );
}
