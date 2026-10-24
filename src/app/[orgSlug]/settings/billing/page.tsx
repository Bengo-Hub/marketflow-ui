"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { BarChart3, ChevronDown, CreditCard, Info, Loader2, MessageCircle, Smartphone, Wallet, Zap } from "lucide-react";
import { TreasuryPaymentModal } from "@bengo-hub/shared-ui-lib/payments";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState, GlassPanel, PageHeader, StatusBadge, ToneBadge } from "@/components/ui-kit";
import { useCreditHistory, useCredits, useLegacyWallet, useTenantSubscription, useUsage } from "@/hooks/use-billing";
import { apiErrorMessage } from "@/lib/api/errors";
import { billingApi, kes, type CreditService, type CreditSnapshot, type UsageMetric } from "@/lib/api/billing";
import { PRICING_URL } from "@/lib/urls";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/auth-store";

const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });
const whenFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

const SERVICE_META: Record<string, { icon: React.ReactNode; blurb: string }> = {
  ai_credits: { icon: <Zap />, blurb: "Used when the assistant answers, writes posts or makes posters and videos. Bundles never expire." },
  whatsapp: { icon: <MessageCircle />, blurb: "Follow-up sequences and broadcasts sent on WhatsApp." },
  sms: { icon: <Smartphone />, blurb: "Follow-up sequences and campaigns sent by SMS." },
};
const ORDER: CreditService[] = ["ai_credits", "whatsapp", "sms"];

const REASON_TEXT: Record<string, string> = {
  no_subscription: "Subscribe to a plan first, then buy a bundle.",
  service_not_activated: "Not switched on yet. Your first bundle switches it on.",
};

const ACTION_LABEL: Record<string, string> = {
  topup: "Bundle bought",
  grant: "Added to your account",
  deduction: "Used",
  refund: "Returned",
  adjustment: "Adjustment",
  overage: "Sent beyond your bundles",
};

function UsageRow({ m }: { m: UsageMetric }) {
  const capped = m.limit > 0;
  const pct = capped ? Math.min(100, Math.round((m.used / m.limit) * 100)) : 0;
  return (
    <li className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3 text-sm">
        <span className="font-medium">{m.name}</span>
        <span className="tabular text-muted-foreground">
          {m.used.toLocaleString()} {capped ? `of ${m.limit.toLocaleString()}` : "used, no limit"}
        </span>
      </div>
      {capped && (
        <div className="h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={m.name}>
          <div className={cn("h-full rounded-full", pct >= 90 ? "bg-destructive" : pct >= 75 ? "bg-warning" : "bg-primary")} style={{ width: `${pct}%` }} />
        </div>
      )}
    </li>
  );
}

function CreditPanel({ snap, onBuy, buying }: { snap: CreditSnapshot; onBuy: (s: CreditSnapshot, code: string, price: number) => void; buying: string | null }) {
  const [open, setOpen] = useState(false);
  const history = useCreditHistory(snap.service as CreditService, open);
  const meta = SERVICE_META[snap.service] ?? { icon: <CreditCard />, blurb: "" };
  const balance = snap.unlimited ? "Unlimited" : (snap.bundle_balance + snap.quota_balance).toLocaleString();
  const low = !snap.exempt && !snap.unlimited && snap.bundle_balance + snap.quota_balance <= 0;

  return (
    <section className="glass flex flex-col rounded-[1.25rem] p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary [&>svg]:size-5">{meta.icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-base font-semibold">{snap.label}</h2>
            {snap.exempt ? <ToneBadge tone="info">Included</ToneBadge> : snap.covered ? <ToneBadge tone="success">Active</ToneBadge> : <ToneBadge tone="warning">Not active</ToneBadge>}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">{meta.blurb}</p>
        </div>
      </div>

      {snap.exempt ? (
        <p className="mt-4 text-sm text-muted-foreground">This account is never billed for {snap.label.toLowerCase()}.</p>
      ) : (
        <>
          <div className="mt-4">
            <p className={cn("font-display text-3xl font-semibold tabular", low && "text-destructive")}>{balance}</p>
            <p className="text-xs text-muted-foreground">
              {snap.quota_balance > 0 ? `${snap.bundle_balance.toLocaleString()} from bundles, ${snap.quota_balance.toLocaleString()} from your plan` : "left to use"}
            </p>
          </div>
          {!snap.covered && snap.reason && <p className="mt-2 text-sm text-warning">{REASON_TEXT[snap.reason] ?? "Not available for this account yet."}</p>}
          {snap.overage_pending_kes > 0 && (
            <p className="mt-2 text-sm">
              {kes(snap.overage_pending_kes)} owed for messages sent beyond your bundles; sending pauses at {kes(snap.overage_cap_kes)}.
            </p>
          )}
          {snap.bundles.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-2">
              {snap.bundles.map((b) => {
                const key = `${snap.service}:${b.code}`;
                return (
                  <Button key={b.code} variant="outline" className="h-auto flex-col gap-0.5 py-3" disabled={buying !== null} onClick={() => onBuy(snap, b.code, b.price_kes)}>
                    {buying === key ? <Loader2 className="animate-spin" /> : (
                      <>
                        <span className="font-display text-base font-semibold tabular">{b.units.toLocaleString()}</span>
                        <span className="text-xs text-muted-foreground tabular">{kes(b.price_kes)}</span>
                      </>
                    )}
                  </Button>
                );
              })}
            </div>
          )}
        </>
      )}

      <button type="button" className="mt-4 flex items-center gap-1 self-start text-sm font-medium text-primary" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Recent activity <ChevronDown className={cn("size-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-2">
          {history.isLoading ? (
            <div className="h-16 animate-pulse rounded-xl bg-muted" />
          ) : (history.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing yet.</p>
          ) : (
            <ul className="divide-y divide-border text-sm">
              {history.data!.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate">{t.description || ACTION_LABEL[t.action] || t.action}</p>
                    <p className="text-xs text-muted-foreground">{whenFmt.format(new Date(t.created_at))}</p>
                  </div>
                  <span className={cn("shrink-0 font-medium tabular", t.tokens > 0 && "text-success")}>{t.tokens > 0 ? "+" : ""}{t.tokens.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

export default function BillingPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();
  const sub = useTenantSubscription();
  const usage = useUsage();
  const credits = useCredits();
  const wallet = useLegacyWallet();
  const [buying, setBuying] = useState<string | null>(null);
  const [buyError, setBuyError] = useState("");
  const [pending, setPending] = useState<{ intentId: string; initiateUrl: string; amount: number; label: string } | null>(null);

  const snaps = [...(credits.data ?? [])]
    .filter((s) => ORDER.includes(s.service as CreditService))
    .sort((a, b) => ORDER.indexOf(a.service as CreditService) - ORDER.indexOf(b.service as CreditService));
  const walletBalance = Number(wallet.data?.balance ?? 0);

  const buy = async (snap: CreditSnapshot, code: string, price: number) => {
    setBuyError("");
    setBuying(`${snap.service}:${code}`);
    try {
      const r = await billingApi.buyCredits(snap.service as CreditService, code, `${window.location.origin}/${orgSlug}/settings/billing?paid=1`);
      if (r.initiate_url && r.intent_id) setPending({ intentId: r.intent_id, initiateUrl: r.initiate_url, amount: price, label: snap.label });
      else if (r.authorization_url) window.location.assign(r.authorization_url);
      else setBuyError("The payment could not start. Try again.");
    } catch (e) {
      setBuyError(apiErrorMessage(e, "The payment could not start. Try again."));
    } finally {
      setBuying(null);
    }
  };

  if (user?.isPlatformOwner) {
    return (
      <div className="space-y-6">
        <PageHeader icon={<CreditCard />} title="Billing" description="Plan, usage and credits for this business." />
        <GlassPanel>
          <p className="text-sm text-muted-foreground">
            You are signed in as the platform owner, whose account is never billed. To see or change a business&apos;s plan and credits, open it from{" "}
            <Link href="/platform/billing" className="font-medium text-primary hover:underline">platform billing</Link>.
          </p>
        </GlassPanel>
      </div>
    );
  }

  const s = sub.data;
  return (
    <div className="space-y-6">
      {pending && (
        <TreasuryPaymentModal
          open
          onOpenChange={(o) => !o && setPending(null)}
          paymentIntentId={pending.intentId}
          initiateUrl={pending.initiateUrl}
          tenantSlug={orgSlug}
          amount={pending.amount}
          currency="KES"
          description={`${pending.label} bundle`}
          referenceType="credit_purchase"
          customerEmail={user?.email}
          onPaymentConfirmed={() => {
            setPending(null);
            void qc.invalidateQueries({ queryKey: ["billing", orgSlug] });
          }}
          onPaymentFailed={() => setPending(null)}
        />
      )}

      <PageHeader icon={<CreditCard />} title="Billing" description="Your plan, what you have used this period, and prepaid credits." />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <GlassPanel title="Plan">
          {sub.isLoading ? (
            <div className="h-20 animate-pulse rounded-xl bg-muted" />
          ) : sub.isError ? (
            <ErrorState message="Could not load your plan." onRetry={() => void sub.refetch()} />
          ) : (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-display text-2xl font-semibold">{s?.plan_name || s?.plan_code || "No plan"}</p>
                {s?.status && <StatusBadge status={s.status.toLowerCase()} />}
              </div>
              <p className="text-sm text-muted-foreground">
                {s?.status?.toUpperCase() === "TRIAL" && s.trial_ends_at
                  ? `Trial ends ${dateFmt.format(new Date(s.trial_ends_at))}.`
                  : s?.current_period_end
                    ? `This period ends ${dateFmt.format(new Date(s.current_period_end))}.`
                    : "No active subscription."}
              </p>
              <a href={`${PRICING_URL}/plans?service=marketflow`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline", size: "sm" })}>
                {s?.plan_code ? "Change plan" : "Choose a plan"}
              </a>
            </div>
          )}
        </GlassPanel>

        <GlassPanel title="This period" description={usage.data?.billingPeriod ? `${dateFmt.format(new Date(usage.data.billingPeriod.start))} to ${dateFmt.format(new Date(usage.data.billingPeriod.end))}` : undefined}>
          {usage.isLoading ? (
            <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-8 animate-pulse rounded-lg bg-muted" />)}</div>
          ) : usage.isError ? (
            <ErrorState message="Could not load usage." onRetry={() => void usage.refetch()} />
          ) : (usage.data?.metrics ?? []).length === 0 ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><BarChart3 className="size-4" /> Nothing used yet this period.</p>
          ) : (
            <ul className="space-y-4">{usage.data!.metrics.map((m) => <UsageRow key={m.key} m={m} />)}</ul>
          )}
        </GlassPanel>
      </div>

      <div>
        <h2 className="font-display text-lg font-semibold">Prepaid credits</h2>
        <p className="text-sm text-muted-foreground">Buy bundles with M-Pesa or card. Units are added as soon as the payment goes through.</p>
      </div>
      {buyError && <p role="alert" className="text-sm text-destructive">{buyError}</p>}
      {credits.isError && <ErrorState message="Could not load your credits." onRetry={() => void credits.refetch()} />}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {credits.isLoading
          ? [0, 1, 2].map((i) => <div key={i} className="glass h-64 animate-pulse rounded-[1.25rem]" />)
          : snaps.map((snap) => <CreditPanel key={snap.service} snap={snap} onBuy={buy} buying={buying} />)}
      </div>

      <GlassPanel>
        <div className="flex gap-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            Ad budgets are paid on your own Meta, TikTok or Google ad account, at the platform&apos;s price. MarketFlow adds no fee to your ad spend; making the ads uses AI credits.
          </p>
        </div>
      </GlassPanel>

      {walletBalance > 0 && wallet.data && (
        <GlassPanel>
          <div className="flex gap-3 text-sm">
            <Wallet className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-muted-foreground">
              You have {kes(walletBalance)} in your Codevertex wallet from an earlier top-up. MarketFlow no longer takes ad money through this wallet. Contact support if you would like it moved or refunded.
            </p>
          </div>
        </GlassPanel>
      )}
    </div>
  );
}
