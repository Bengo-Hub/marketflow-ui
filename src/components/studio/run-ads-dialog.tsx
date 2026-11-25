"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { MoneyInput } from "@bengo-hub/shared-ui-lib/payments";
import { useDebouncedValue } from "@bengo-hub/shared-ui-lib/search";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, ToneBadge, type Tone } from "@/components/ui-kit";
import { codeErrorText } from "@/components/studio/boost-dialog";
import {
  markTikTokDone,
  MAX_OTP_TRIES,
  noVerifiedPhone,
  planRunAds,
  runAds,
  runAdsError,
  runAdsOTP,
  type PlanStep,
  type PlatformPlan,
  type PlatformResult,
  type RunAdsInput,
  type RunChoice,
  type RunOutcome,
  type RunPlan,
} from "@/lib/api/ads";
import { apiErrorMessage } from "@/lib/api/errors";
import { ACCOUNTS_URL } from "@/lib/urls";
import { formatBudget } from "@/lib/money";
import {
  buildChoice,
  confirmLabel,
  EMPTY_FORM,
  estimateLine,
  modeLabel,
  PLATFORM_LABEL,
  sourceLabel,
  TIER_LABEL,
  withLocal,
  type PlatformForm,
  type RunAdsForm,
} from "@/lib/ads/run-ads";
import { cn } from "@/lib/utils";

const RESULT_TONE: Record<string, Tone> = { created: "success", guided: "info", failed: "danger", skipped: "neutral" };
const RESULT_LABEL: Record<string, string> = { created: "Created", guided: "Set it up with the steps", failed: "Failed", skipped: "Skipped" };

function expiryHint(at: string): string | undefined {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return undefined;
  return `The code works until ${d.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" })}.`;
}

/**
 * Run ads for an approved video on Meta, Google Ads and TikTok in one plan. Every change asks the
 * API for the plan again (debounced), and Confirm sends the fingerprint of the plan on screen, so
 * the owner confirms exactly what they saw. Nothing is spent before Confirm.
 */
export function RunAdsDialog({ open, onOpenChange, versionId }: { open: boolean; onOpenChange: (o: boolean) => void; versionId: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<RunAdsForm>(EMPTY_FORM);
  const [daysText, setDaysText] = useState<string | null>(null);
  const key = useMemo(() => JSON.stringify(buildChoice(form)), [form]);
  const debKey = useDebouncedValue(key, 400);
  const planKey = ["run-ads-plan", versionId, debKey] as const;
  const [outcome, setOutcome] = useState<RunOutcome | null>(null);
  const plan = useQuery({
    queryKey: planKey,
    queryFn: () => planRunAds(versionId, JSON.parse(debKey) as RunChoice),
    enabled: open && !outcome,
    placeholderData: keepPreviousData,
    retry: false,
    staleTime: 0,
  });
  const p = plan.data;
  // Confirm uses the plan built from what is on screen now, not a placeholder of an older choice.
  const current = !!p && key === debKey && !plan.isFetching && !plan.isPlaceholderData;

  const run = useMutation({ mutationFn: runAds });
  const sendOtp = useMutation({ mutationFn: runAdsOTP });
  const [error, setError] = useState<string | null>(null);
  const [needsPhone, setNeedsPhone] = useState(false);
  const [otp, setOtp] = useState<{ body: RunAdsInput; id: string; to: string; expiresAt: string } | null>(null);
  const [code, setCode] = useState("");
  const [tries, setTries] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const outOfTries = tries >= MAX_OTP_TRIES;

  const setPlatform = (platform: string, change: PlatformForm) =>
    setForm((f) => ({ ...f, currency: change.daily ? p?.currency : f.currency, platforms: { ...f.platforms, [platform]: { ...f.platforms[platform], ...change } } }));

  /** A 409 carries the plan as it is now: show it, so the owner confirms that one. */
  const showFreshPlan = (fresh: RunPlan | undefined) => {
    if (fresh) qc.setQueryData(planKey, fresh);
    else void qc.invalidateQueries({ queryKey: ["run-ads-plan", versionId] });
  };

  const refused = (e: unknown, body: RunAdsInput): boolean => {
    const r = runAdsError(e);
    if (r.status === 428 && r.code === "otp_required") {
      requestCode(body);
      return true;
    }
    if (r.status === 409 && (r.code === "plan_changed" || r.code === "not_ready")) {
      showFreshPlan(r.plan);
      setOtp(null);
      setError(r.code === "plan_changed" ? "The plan changed since it was shown. Check it again, then confirm." : apiErrorMessage(e, "The plan is not ready yet."));
      return true;
    }
    return false;
  };

  const requestCode = (body: RunAdsInput) => {
    setOtpError(null);
    sendOtp.mutate(body, {
      onSuccess: (o) => {
        setOtp({ body, id: o.otp_id, to: o.to_masked, expiresAt: o.expires_at });
        setCode("");
        setTries(0);
      },
      onError: (e) => {
        if (noVerifiedPhone(e)) {
          setOtp(null);
          setNeedsPhone(true);
          setError("This plan needs a code sent to your WhatsApp, and your account has no verified WhatsApp number yet. Add one in your account settings, then confirm again.");
          return;
        }
        if (refused(e, body)) return;
        const msg = apiErrorMessage(e, "We could not send the code. Please try again.");
        if (otp) setOtpError(msg);
        else setError(msg);
      },
    });
  };

  const submit = () => {
    if (!p || !current || !p.ready) return;
    setError(null);
    setNeedsPhone(false);
    const body: RunAdsInput = { version_id: versionId, ...(JSON.parse(debKey) as RunChoice), fingerprint: p.fingerprint };
    run.mutate(body, {
      onSuccess: setOutcome,
      onError: (e) => {
        if (!refused(e, body)) setError(apiErrorMessage(e, "Could not run the ads"));
      },
    });
  };

  const confirmCode = () => {
    if (!otp) return;
    setOtpError(null);
    run.mutate(
      { ...otp.body, otp_id: otp.id, otp_code: code },
      {
        onSuccess: (o) => {
          setOtp(null);
          setOutcome(o);
        },
        onError: (e) => {
          const r = runAdsError(e);
          if (r.status === 422 && r.code === "otp_invalid") {
            const used = tries + 1;
            setTries(used);
            setCode("");
            setOtpError(codeErrorText(apiErrorMessage(e, ""), MAX_OTP_TRIES - used));
            return;
          }
          if (r.status === 428) {
            setTries(MAX_OTP_TRIES);
            setOtpError("That code has expired. Ask for a new code.");
            return;
          }
          if (refused(e, otp.body)) return;
          setOtpError(apiErrorMessage(e, "Could not run the ads"));
        },
      },
    );
  };

  const busy = run.isPending || sendOtp.isPending;
  const cur = p?.currency ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <DialogHeader>
          <DialogTitle>Run ads</DialogTitle>
          <DialogDescription>
            One plan for Meta, Google Ads and TikTok. The ads run on your own ad accounts and you pay each platform directly.
          </DialogDescription>
        </DialogHeader>

        {outcome ? (
          <RunResults outcome={outcome} />
        ) : otp ? (
          <div className="space-y-3">
            <p className="text-sm">
              This plan needs your go-ahead. We sent a 6-digit code to <strong>{otp.to}</strong> on WhatsApp. Enter it to run the ads.
            </p>
            <Field label="Code from WhatsApp" htmlFor="run-otp" hint={expiryHint(otp.expiresAt)}>
              <Input
                id="run-otp"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="123456"
                value={code}
                disabled={outOfTries || run.isPending}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && code.length === 6 && !outOfTries) confirmCode();
                }}
              />
            </Field>
            {otpError && <p role="alert" className="text-sm text-destructive">{otpError}</p>}
            <Button size="sm" variant="outline" disabled={busy} onClick={() => requestCode(otp.body)}>
              {sendOtp.isPending ? "Sending..." : "Send a new code"}
            </Button>
          </div>
        ) : plan.isError && !p ? (
          <p role="alert" className="text-sm text-destructive">{apiErrorMessage(plan.error, "Could not build the plan")}</p>
        ) : !p ? (
          <div className="h-48 animate-pulse rounded-xl bg-muted" aria-busy />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field
                label="Days"
                htmlFor="run-days"
                hint={p.days_hint ? `Suggestion: ${p.days_hint.days} days. ${sourceLabel(p.days_hint.source, p.days_hint.label)}.` : "Shared by every platform."}
              >
                <div className="flex gap-2">
                  <Input
                    id="run-days"
                    type="number"
                    min={1}
                    max={90}
                    value={daysText ?? String(p.days)}
                    onChange={(e) => {
                      setDaysText(e.target.value);
                      const n = Number(e.target.value);
                      setForm((f) => ({ ...f, days: Number.isInteger(n) && n >= 1 && n <= 90 ? n : undefined }));
                    }}
                  />
                  {p.days_hint && p.days_hint.days !== p.days && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setDaysText(String(p.days_hint!.days));
                        setForm((f) => ({ ...f, days: p.days_hint!.days }));
                      }}
                    >
                      Use {p.days_hint.days}
                    </Button>
                  )}
                </div>
              </Field>
              <Field label="Total cap" htmlFor="run-cap" hint="The most all platforms together may spend. 0 is no cap.">
                <MoneyInput
                  id="run-cap"
                  currency={cur}
                  wholeOnly
                  min={0}
                  value={form.totalCap ?? p.total_cap}
                  onChange={(v) => setForm((f) => ({ ...f, currency: cur, totalCap: Math.max(0, v ?? 0) }))}
                />
              </Field>
            </div>

            {p.platforms.map((pp) => (
              <PlatformCard
                key={pp.platform}
                pp={pp}
                currency={cur}
                localCurrency={p.local_currency}
                form={form.platforms[pp.platform] ?? {}}
                onChange={(c) => setPlatform(pp.platform, c)}
              />
            ))}

            <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
              <p>
                Total for all platforms: <strong>{withLocal(p.total, cur, p.local_total, p.local_currency)}</strong> over {p.days} {p.days === 1 ? "day" : "days"}
                {p.total_cap > 0 ? `, within your cap of ${formatBudget(p.total_cap, cur)}` : ""}.
              </p>
              {p.notes?.map((n) => (
                <p key={n} className="text-muted-foreground">{n}</p>
              ))}
              {p.otp_required && <p className="text-muted-foreground">A plan this size needs a code sent to your WhatsApp before it runs.</p>}
              {p.blockers.map((b) => (
                <p key={b} className="text-destructive">{b}</p>
              ))}
              {plan.isFetching && <p className="text-xs text-muted-foreground">Updating the plan...</p>}
              {plan.isError && <p className="text-destructive">{apiErrorMessage(plan.error, "Could not update the plan")}</p>}
            </div>
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
            {needsPhone && (
              <a href={ACCOUNTS_URL} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm", variant: "outline" })}>
                Open account settings
              </a>
            )}
          </div>
        )}

        {!outcome && otp && (
          <DialogFooter>
            <Button variant="outline" onClick={() => setOtp(null)} disabled={run.isPending}>Back</Button>
            <Button onClick={confirmCode} disabled={run.isPending || outOfTries || code.length !== 6}>
              {run.isPending ? "Checking..." : "Confirm and run ads"}
            </Button>
          </DialogFooter>
        )}
        {!outcome && !otp && p && (
          <DialogFooter className="sm:items-center">
            <p className="text-xs text-muted-foreground sm:mr-auto">Nothing is spent until you confirm.</p>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
            <Button onClick={submit} disabled={busy || !current || !p.ready}>
              {sendOtp.isPending ? "Sending code..." : run.isPending ? "Starting..." : confirmLabel(p.total, cur)}
            </Button>
          </DialogFooter>
        )}
        {outcome && (
          <DialogFooter>
            <Button onClick={() => onOpenChange(false)}>Done</Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function StepLink({ step }: { step: PlanStep }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  if (step.path) {
    return (
      <Link href={`/${orgSlug}${step.path.startsWith("/") ? "" : "/"}${step.path}`} className="text-primary hover:underline">
        {step.label}
      </Link>
    );
  }
  if (step.url) {
    return (
      <a href={step.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
        {step.label} <ExternalLink className="size-3.5" aria-hidden />
      </a>
    );
  }
  return <span>{step.label}</span>;
}

function FundingLine({ pp }: { pp: PlatformPlan }) {
  const f = pp.funding;
  const tone: Tone = f.can_spend === true ? "success" : f.can_spend === false ? "danger" : "neutral";
  const text = f.can_spend === true ? "Can spend" : f.can_spend === false ? "Cannot spend yet" : "Funding not shown by the platform";
  return (
    <div className="space-y-1">
      <p className="flex flex-wrap items-center gap-2">
        <ToneBadge tone={tone}>{text}</ToneBadge>
        {f.detail && <span className="text-muted-foreground">{f.detail}</span>}
      </p>
      {!!f.shortfall && f.shortfall > 0 && pp.account && (
        <p className="text-muted-foreground">Still to add: {formatBudget(f.shortfall, pp.account.currency)}</p>
      )}
      {f.link && (
        <a href={f.link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
          Add money or a payment method <ExternalLink className="size-3.5" aria-hidden />
        </a>
      )}
    </div>
  );
}

/** One platform of the plan: on or off, the budget, what it buys and what is still to do. */
function PlatformCard({
  pp,
  currency,
  localCurrency,
  form,
  onChange,
}: {
  pp: PlatformPlan;
  currency: string;
  localCurrency?: string;
  form: PlatformForm;
  onChange: (c: PlatformForm) => void;
}) {
  const label = PLATFORM_LABEL[pp.platform] ?? pp.platform;
  const on = form.enabled ?? pp.enabled;
  const typed = form.daily !== undefined && form.daily > 0;
  // A tier was picked but the business's own daily amount from Settings still applies.
  const ownAmount = !!form.tier && !typed && pp.tier === "custom";
  return (
    <section className={cn("space-y-3 rounded-xl border border-border p-4", !on && "opacity-70")} aria-label={label}>
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-display text-sm font-semibold">{label}</h3>
        <ToneBadge tone="neutral">{modeLabel(pp.mode, pp.platform)}</ToneBadge>
        <Switch className="ml-auto" checked={on} onCheckedChange={(c) => onChange({ enabled: c })} aria-label={`Run ads on ${label}`} />
      </div>
      {pp.account ? (
        <p className="text-sm text-muted-foreground">
          Account: <span className="text-foreground">{pp.account.name}</span>
          {pp.account.currency ? ` (${pp.account.currency})` : ""}
        </p>
      ) : (
        <p className="text-sm text-muted-foreground">No account connected yet.</p>
      )}

      {on && (
        <div className="space-y-3 text-sm">
          {pp.tiers.length > 0 && (
            <div role="group" aria-label={`Daily budget for ${label}`} className="grid gap-2 sm:grid-cols-3">
              {pp.tiers.map((t) => {
                const picked = !typed && pp.tier === t.name;
                return (
                  <button
                    key={t.name}
                    type="button"
                    aria-pressed={picked}
                    onClick={() => onChange({ tier: t.name, daily: undefined })}
                    className={cn(
                      "flex flex-col gap-1 rounded-lg border p-3 text-left transition-colors",
                      picked ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
                    )}
                  >
                    <span className="flex items-center gap-2 font-medium">
                      {TIER_LABEL[t.name] ?? t.name}
                      {t.recommended && t.name !== "recommended" && <ToneBadge tone="primary">Suggested</ToneBadge>}
                    </span>
                    <span>{formatBudget(t.daily, currency)} per day</span>
                    {t.estimates.map((e, i) => (
                      <span key={i} className="text-xs text-muted-foreground">{estimateLine(e, pp.platform)}</span>
                    ))}
                    <span className="text-xs text-muted-foreground">Amount: {sourceLabel(t.source, t.label, pp.platform)}</span>
                  </button>
                );
              })}
            </div>
          )}
          <Field label="Or your own daily amount" htmlFor={`run-daily-${pp.platform}`} hint={ownAmount ? "Your own daily amount from Settings applies here. Type an amount to change it." : undefined}>
            <MoneyInput
              id={`run-daily-${pp.platform}`}
              currency={currency}
              wholeOnly
              min={0}
              value={typed ? form.daily! : pp.tier === "custom" && pp.daily > 0 ? pp.daily : null}
              onChange={(v) => onChange({ daily: v && v > 0 ? v : undefined, tier: undefined })}
            />
          </Field>

          <p>
            {formatBudget(pp.daily, currency)} per day for {pp.days} {pp.days === 1 ? "day" : "days"}: <strong>{withLocal(pp.total, currency, pp.local_total, localCurrency)}</strong>
            {pp.account && pp.account.currency && pp.account.currency !== currency && pp.account_daily
              ? `. Sent to ${label} as ${formatBudget(pp.account_daily, pp.account.currency)} per day (${formatBudget(pp.account_total ?? 0, pp.account.currency)} in total).`
              : "."}
          </p>
          {(typed || pp.tier === "custom") && pp.estimates.length > 0 && (
            <ul className="space-y-0.5 text-xs text-muted-foreground">
              {pp.estimates.map((e, i) => (
                <li key={i}>{estimateLine(e, pp.platform)}</li>
              ))}
            </ul>
          )}
          {pp.platform === "meta" && (
            <p className="text-muted-foreground">
              MarketFlow launch: {pp.launch_credits ? `${pp.launch_credits} AI credits` : "included in your plan"}
            </p>
          )}

          <FundingLine pp={pp} />
          {typeof pp.month_spend === "number" && (
            <p className="text-muted-foreground">Spent on {label} this month: {formatBudget(pp.month_spend, currency)}</p>
          )}
          {pp.results_note && <p className="text-muted-foreground">{pp.results_note}</p>}

          {pp.setup.length > 0 && (
            <div>
              <p className="font-medium">To set up first</p>
              <ul className="list-disc space-y-0.5 pl-5">
                {pp.setup.map((s, i) => (
                  <li key={i} className={cn(s.done && "text-muted-foreground line-through")}><StepLink step={s} /></li>
                ))}
              </ul>
            </div>
          )}
          {pp.steps.length > 0 && (
            <div>
              <p className="font-medium">How it is set up</p>
              <ol className="list-decimal space-y-0.5 pl-5">
                {pp.steps.map((s, i) => (
                  <li key={i}><StepLink step={s} /></li>
                ))}
              </ol>
            </div>
          )}
          {pp.blockers.map((b) => (
            <p key={b} className="text-destructive">{b}</p>
          ))}
          {pp.notes.map((n) => (
            <p key={n} className="text-muted-foreground">{n}</p>
          ))}
        </div>
      )}
    </section>
  );
}

/** What confirming did on each platform, with the TikTok steps when TikTok is guided. */
function RunResults({ outcome }: { outcome: RunOutcome }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return (
    <div className="space-y-3 text-sm">
      {outcome.replayed && <p className="text-muted-foreground">This plan had already been confirmed, so nothing ran again. Here is what it did.</p>}
      {outcome.text && <p>{outcome.text}</p>}
      {outcome.results.map((r) => (
        <ResultRow key={r.platform} r={r} />
      ))}
      <Link href={`/${orgSlug}/campaigns`} className={buttonVariants({ size: "sm", variant: "outline" })}>
        Open campaigns
      </Link>
    </div>
  );
}

function ResultRow({ r }: { r: PlatformResult }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [ticked, setTicked] = useState<number[]>([]);
  const [done, setDone] = useState(false);
  const finish = useMutation({
    mutationFn: () => markTikTokDone(r.campaign_id!),
    onSuccess: () => {
      setDone(true);
      toast.success("Thanks. The TikTok campaign is marked as running.");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not mark it as set up")),
  });
  const label = PLATFORM_LABEL[r.platform] ?? r.platform;
  const guidedTikTok = r.platform === "tiktok" && r.status === "guided" && !!r.campaign_id;
  return (
    <section className="space-y-2 rounded-xl border border-border p-3" aria-label={label}>
      <p className="flex flex-wrap items-center gap-2">
        <span className="font-medium">{label}</span>
        <ToneBadge tone={RESULT_TONE[r.status] ?? "neutral"}>{RESULT_LABEL[r.status] ?? r.status}</ToneBadge>
        {r.campaign_id && r.status === "created" && (
          <Link href={`/${orgSlug}/campaigns`} className="ml-auto text-primary hover:underline">See it in campaigns</Link>
        )}
      </p>
      {r.message && <p className={cn(r.status === "failed" ? "text-destructive" : "text-muted-foreground")}>{r.message}</p>}
      {r.steps && r.steps.length > 0 && (
        <ul className="space-y-1">
          {r.steps.map((s, i) => (
            <li key={i} className="flex items-start gap-2">
              <input
                type="checkbox"
                className="mt-1"
                aria-label={`Done: ${s.label}`}
                checked={done || ticked.includes(i)}
                disabled={done}
                onChange={() => setTicked((t) => (t.includes(i) ? t.filter((x) => x !== i) : [...t, i]))}
              />
              <StepLink step={s} />
            </li>
          ))}
        </ul>
      )}
      {guidedTikTok && (
        <Button size="sm" disabled={done || finish.isPending} onClick={() => finish.mutate()}>
          {done ? "Marked as set up" : finish.isPending ? "Saving..." : "I've set it up"}
        </Button>
      )}
    </section>
  );
}
