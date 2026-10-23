"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  apiError,
  marketingOsApi,
  type AskResponse,
  type BrandContext,
  type CreativePlan,
  type PlanOption,
  type TaskSpec,
  type TeamMember,
  type TeamProgress,
  type TeamStep,
} from "@/lib/api/marketing-os";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const MAX_ASK = 2000;

const ENTITY_LABELS: Record<string, string> = {
  offering: "Product",
  audience: "Audience",
  objective: "Objective",
  goal: "Goal",
  topic: "Topic",
  competitors: "Competitors",
  platforms: "Platforms",
  budget_kes: "Ad budget",
  period_days: "Period",
  url: "Link",
  language: "Language",
};

function entityValue(key: string, v: unknown): string {
  if (Array.isArray(v)) return v.join(", ");
  if (key === "budget_kes") return `KES ${Number(v).toLocaleString()}`;
  if (key === "period_days") return `${v} days`;
  return String(v);
}

/** What the optimiser understood: shown before anything is charged. */
function SpecPreview({ spec, team }: { spec: TaskSpec; team: TeamMember[] }) {
  const who = team.find((m) => m.key === spec.specialist);
  const entries = Object.entries(spec.entities ?? {}).filter(
    ([, v]) => v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
  );
  return (
    <div className="rounded-lg border bg-muted/40 p-4 space-y-3">
      <p className="text-sm">
        <span className="text-muted-foreground">We understood this as </span>
        <span className="font-medium">{spec.optimised_brief || spec.playbook}</span>
      </p>
      <p className="text-xs text-muted-foreground">
        {who ? `${who.name} (${who.role}) will take it.` : "Your Marketing Manager will plan it."}
        {spec.complexity === "campaign" && " This is a multi-step job; the manager splits it across the team."}
      </p>
      {entries.length > 0 && (
        <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
          {entries.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted-foreground">{ENTITY_LABELS[k] ?? k}</dt>
              <dd>{entityValue(k, v)}</dd>
            </div>
          ))}
        </dl>
      )}
      {spec.missing_fields && spec.missing_fields.length > 0 && (
        <p className="text-sm text-amber-700 dark:text-amber-400">
          Still needed: {spec.missing_fields.map((f) => ENTITY_LABELS[f] ?? f).join(", ")}.
        </p>
      )}
    </div>
  );
}

function OptionRow({
  option,
  recommended,
  current,
  onPick,
}: {
  option: PlanOption;
  recommended?: boolean;
  current: boolean;
  onPick?: () => void;
}) {
  return (
    <div className={cn("rounded-lg border p-4 space-y-2", recommended && "border-primary/60 bg-primary/5")}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">
            {option.label}
            {recommended && <Badge className="ml-2 align-middle text-[10px]">Recommended</Badge>}
          </p>
          <p className="text-sm text-muted-foreground">{option.description}</p>
        </div>
        <p className="text-right shrink-0">
          <span className="text-lg font-semibold tabular-nums">{option.credits}</span>
          <span className="block text-xs text-muted-foreground">credits</span>
        </p>
      </div>
      <p className="text-sm">
        Writes {option.variants} variants, then picks the best {option.shortlist} for you to review.
      </p>
      <ul className="text-xs text-muted-foreground space-y-0.5">
        {option.lines.map((l) => (
          <li key={l.key} className="flex justify-between gap-3">
            <span>
              {l.name}
              {l.qty > 1 && ` × ${l.qty}`}
            </span>
            <span className="tabular-nums">{l.credits}</span>
          </li>
        ))}
      </ul>
      {!option.affordable && <p className="text-xs text-destructive">More than your credit balance.</p>}
      {onPick && !current && (
        <Button size="sm" variant="outline" onClick={onPick}>
          Quote this instead
        </Button>
      )}
    </div>
  );
}

function PlanView({
  plan,
  orgSlug,
  approving,
  onApprove,
  onRequote,
}: {
  plan: CreativePlan;
  orgSlug: string;
  approving: boolean;
  onApprove: () => void;
  onRequote: (tier: string) => void;
}) {
  const copy = plan.recommended.lines.find((l) => l.key === "copy_batch");
  return (
    <div className="space-y-4">
      <div className="grid gap-3 text-sm sm:grid-cols-3">
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">Ad budget</p>
          <p className="font-medium">
            {plan.ad_budget_kes > 0 ? `KES ${plan.ad_budget_kes.toLocaleString()} over ${plan.days} days` : "Organic only"}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">Ads the budget can test</p>
          <p className="font-medium">
            {plan.ad_budget_kes > 0 ? `${plan.max_live_ads} at once` : "Not running paid ads"}
            {plan.daily_per_ad_kes ? `, KES ${Math.round(plan.daily_per_ad_kes).toLocaleString()} a day each` : ""}
          </p>
        </div>
        <div className="rounded-lg border p-3">
          <p className="text-muted-foreground text-xs">Your credits</p>
          <p className="font-medium">{plan.credits_available < 0 ? "Unknown" : plan.credits_available}</p>
        </div>
      </div>

      <OptionRow option={plan.recommended} recommended current />
      {plan.alternatives.map((a) => (
        <OptionRow
          key={a.label}
          option={a}
          current={false}
          onPick={a.tier && a.tier !== plan.recommended.tier ? () => onRequote(a.tier!) : undefined}
        />
      ))}

      {plan.notes?.map((n) => (
        <p key={n} className="text-sm text-muted-foreground">
          {n}
        </p>
      ))}

      {plan.shortfall > 0 ? (
        <div className="rounded-lg border border-amber-500/50 bg-amber-500/10 p-4 text-sm space-y-2">
          <p>
            This plan needs {plan.shortfall} more credits than you have.
            {plan.suggested_bundle &&
              ` The ${plan.suggested_bundle.units}-credit bundle (KES ${plan.suggested_bundle.price_kes.toLocaleString()}) covers it.`}
          </p>
          <Link href={`/${orgSlug}/settings/billing`} className={buttonVariants({ size: "sm", variant: "outline" })}>
            Buy credits
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Poster and video production is not switched on yet. Approving now writes and reviews the copy
            {copy ? ` (${copy.credits} credits plus 1 for the request)` : ""}; nothing is posted or paid for until you
            say so.
          </p>
          <Button onClick={onApprove} disabled={approving} className="gap-2">
            {approving && <Loader2 className="h-4 w-4 animate-spin" />}
            Approve plan
          </Button>
        </div>
      )}
    </div>
  );
}

type AdVariant = {
  id: string;
  format?: string;
  angle: string;
  hook: string;
  headline: string;
  primary_text: string;
  cta: string;
  hypothesis: string;
};

function StepOutput({ step, shortlist }: { step: TeamStep; shortlist: Set<string> }) {
  if (step.error) return <p className="text-sm text-destructive">{step.error}</p>;
  const out = step.output as Record<string, unknown> | undefined;

  if (step.contract === "ad_copy_batch" && Array.isArray(out?.variants)) {
    const variants = [...(out.variants as AdVariant[])].sort(
      (a, b) => Number(shortlist.has(b.id)) - Number(shortlist.has(a.id)),
    );
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {variants.map((v) => (
          <div
            key={v.id}
            className={cn("rounded-lg border p-3 space-y-1.5 text-sm", shortlist.has(v.id) && "border-primary/60 bg-primary/5")}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs text-muted-foreground">{v.angle}</span>
              {shortlist.has(v.id) && (
                <Badge className="text-[10px] gap-1">
                  <Check className="h-3 w-3" /> Shortlisted
                </Badge>
              )}
            </div>
            <p className="font-medium">{v.headline}</p>
            <p>{v.hook}</p>
            <p className="text-muted-foreground whitespace-pre-wrap">{v.primary_text}</p>
            <p className="text-xs">
              Button: <span className="font-medium">{v.cta}</span>
            </p>
            <p className="text-xs text-muted-foreground">Testing: {v.hypothesis}</p>
          </div>
        ))}
      </div>
    );
  }

  if (step.text) {
    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{step.text}</ReactMarkdown>
      </div>
    );
  }
  return (
    <pre className="text-xs bg-muted rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">
      {JSON.stringify(out, null, 2)}
    </pre>
  );
}

/** Seconds since `active` became true, ticking once a second; 0 when idle. */
function useElapsed(active: boolean): number {
  const [secs, setSecs] = useState(0);
  useEffect(() => {
    if (!active) {
      setSecs(0);
      return;
    }
    const started = Date.now();
    const id = setInterval(() => setSecs(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(id);
  }, [active]);
  return secs;
}

/** What the owner sees while the team works, so a long request never looks frozen. */
function workingText(secs: number, approving: boolean): string {
  if (secs < 5) return approving ? "Starting the work…" : "Reading your request…";
  if (secs < 25) return approving ? "The team is writing your drafts…" : "The team is working on it…";
  if (secs < 60) return `Still working (${secs}s). Bigger jobs take up to a minute and a half.`;
  return `Still working (${secs}s). If a writer is slow the team switches to a backup, and you get whatever is ready.`;
}

/**
 * The owner's one box: type what you need, see what the team understood (free),
 * send it (1 credit), answer a question or approve a quote, review the drafts.
 */
export function ManagerConsole({
  orgSlug,
  team,
  draft,
  onDraftChange,
}: {
  orgSlug: string;
  team: TeamMember[];
  draft: string;
  onDraftChange: (v: string) => void;
}) {
  const qc = useQueryClient();
  const [spec, setSpec] = useState<TaskSpec | null>(null);
  const [res, setRes] = useState<AskResponse | null>(null);
  const [tier, setTier] = useState("");

  const preview = useMutation({
    mutationFn: () => marketingOsApi.optimize(draft.trim()),
    onSuccess: (s) => {
      setSpec(s);
      setRes(null);
    },
    onError: (e) => toast.error(apiError(e, "Could not read the request")),
  });

  const [stages, setStages] = useState<TeamProgress[]>([]);
  const ask = useMutation({
    mutationFn: (opts: { approve?: boolean; tier?: string }) => {
      setStages([]);
      return marketingOsApi.askStream(
        { text: draft.trim(), approve_plan: opts.approve, tier: opts.tier || undefined },
        (p) => setStages((s) => [...s, p]),
      );
    },
    onSuccess: (r) => {
      setRes(r);
      if (r.result.spec) setSpec(r.result.spec);
      if (r.credits_charged > 0) qc.invalidateQueries({ queryKey: ["wallet"] });
    },
    onError: (e) => {
      const timedOut = (e as { code?: string })?.code === "ECONNABORTED";
      toast.error(
        timedOut
          ? "The team took too long to answer. Try again, or ask for one part at a time."
          : apiError(e, "The team could not finish this request"),
      );
    },
  });

  const saveBrand = useMutation({
    mutationFn: (bc: BrandContext) => marketingOsApi.saveBrandContext(bc),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["os-brand-context"] });
      toast.success("Saved as your brand context");
    },
    onError: (e) => toast.error(apiError(e, "Could not save the brand context")),
  });

  const result = res?.result;
  const shortlist = new Set(result?.shortlist ?? []);
  const tooLong = draft.length > MAX_ASK;
  const busy = preview.isPending || ask.isPending;
  const elapsed = useElapsed(ask.isPending);
  const brandStep = result?.steps?.find((s) => s.contract === "brand_context" && s.output);

  const reset = () => {
    setSpec(null);
    setRes(null);
    setTier("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Ask your Marketing Manager</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Textarea
            rows={4}
            value={draft}
            aria-label="What do you need?"
            placeholder="Nataka matangazo ya TikTok ya shea butter lotion, budget elfu tatu kwa wiki"
            onChange={(e) => {
              onDraftChange(e.target.value);
              if (spec || res) reset();
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className={cn("text-xs", tooLong ? "text-destructive" : "text-muted-foreground")}>
              English or Swahili. {draft.length}/{MAX_ASK}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => preview.mutate()} disabled={!draft.trim() || tooLong || busy}>
                {preview.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Check first (free)
              </Button>
              <Button onClick={() => ask.mutate({})} disabled={!draft.trim() || tooLong || busy}>
                {ask.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                Send to the team (1 credit)
              </Button>
            </div>
          </div>
        </div>

        {ask.isPending && (
          <div role="status" aria-live="polite" className="space-y-1.5 text-sm">
            {stages.slice(0, -1).map((s, i) => (
              <p key={i} className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-primary" /> {s.label}
              </p>
            ))}
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              {stages.length > 0
                ? `${stages[stages.length - 1].label}${elapsed >= 25 ? ` (${elapsed}s)` : ""}`
                : workingText(elapsed, !!ask.variables?.approve)}
            </p>
          </div>
        )}

        {spec && <SpecPreview spec={spec} team={team} />}

        {spec?.injection_suspected && (
          <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-4 w-4" /> Part of this reads like instructions to the AI. The team will treat it as text.
          </p>
        )}

        {result?.route === "clarify" && (
          <div className="rounded-lg border border-primary/40 p-4 space-y-1">
            <p className="text-sm font-medium">{result.question}</p>
            <p className="text-xs text-muted-foreground">
              Add the answer to your request above and send it again. You were not charged for this question.
            </p>
          </div>
        )}

        {(result?.route === "chat" || result?.route === "blocked") && res?.answer && (
          <div className="prose prose-sm dark:prose-invert max-w-none rounded-lg bg-muted/50 p-4">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{res.answer}</ReactMarkdown>
          </div>
        )}

        {result?.route === "quote" && result.plan && (
          <PlanView
            plan={result.plan}
            orgSlug={orgSlug}
            approving={ask.isPending}
            onApprove={() => ask.mutate({ approve: true, tier })}
            onRequote={(t) => {
              setTier(t);
              ask.mutate({ tier: t });
            }}
          />
        )}

        {result?.route === "done" && (
          <div className="space-y-5">
            {result.steps?.map((s, i) => {
              const m = team.find((t) => t.key === s.member);
              return (
                <section key={`${s.member}-${i}`} className="space-y-2">
                  <h3 className="text-sm font-medium">
                    {m ? `${m.name}, ${m.role}` : s.member}
                    <span className="block font-normal text-muted-foreground">{s.task}</span>
                  </h3>
                  <StepOutput step={s} shortlist={shortlist} />
                </section>
              );
            })}

            {result.findings && result.findings.length > 0 && (
              <section className="space-y-2">
                <h3 className="text-sm font-medium">Reviewer notes</h3>
                <ul className="space-y-2">
                  {result.findings.map((f, i) => (
                    <li key={i} className="rounded-lg border p-3 text-sm space-y-1">
                      <Badge
                        variant={f.severity === "high" ? "destructive" : "secondary"}
                        className="text-[10px] capitalize"
                      >
                        {f.severity === "high" ? "Must fix" : f.severity === "review" ? "Check" : "Minor"}
                      </Badge>
                      <p>&ldquo;{f.quote}&rdquo;: {f.issue}</p>
                      {f.fix && <p className="text-muted-foreground">Suggested: {f.fix}</p>}
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {result.next_actions && result.next_actions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {result.next_actions.map((a) =>
                  a.key === "save_brand_context" && brandStep ? (
                    <Button
                      key={a.key}
                      size="sm"
                      onClick={() => saveBrand.mutate(brandStep.output as BrandContext)}
                      disabled={saveBrand.isPending}
                    >
                      {a.label}
                    </Button>
                  ) : (
                    <Button key={a.key} size="sm" variant="outline" disabled title="Coming soon">
                      {a.label}
                    </Button>
                  ),
                )}
              </div>
            )}
          </div>
        )}

        {res && (
          <div className="flex items-center justify-between gap-3 border-t pt-3">
            <p className="text-xs text-muted-foreground">
              {res.credits_charged > 0
                ? `${res.credits_charged} ${res.credits_charged === 1 ? "credit" : "credits"} used.`
                : "No credits used."}
            </p>
            <Button size="sm" variant="ghost" onClick={reset} disabled={busy}>
              Discard
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
