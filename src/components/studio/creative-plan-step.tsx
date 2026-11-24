"use client";

import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useTenantCurrency } from "@/hooks/use-tenant-profile";
import { tenantProfileApi } from "@/lib/api/tenant-profile";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { CapsuleTabs, Field } from "@/components/ui-kit";
import { apiErrorMessage } from "@/lib/api/errors";
import { MoneyInput } from "@bengo-hub/shared-ui-lib/payments";
import { formatBudget } from "@/lib/money";
import { marketingOsApi, type CreativePlan } from "@/lib/api/marketing-os";
import {
  briefPlan,
  budgetToKES,
  DEFAULT_PLAN_INPUT,
  planBudgetCurrency,
  type PlanBudgetEntry,
  type PlanRateState,
  optionPriceLine,
  PLAN_PLATFORMS,
  PLAN_TIERS,
  planInputProblems,
  planOptions,
  type BriefPlan,
  type PlanQuoteInput,
} from "@/lib/studio/creative-plan";

/**
 * The Studio form's optional Creative Plan step (Sprint 15): budget, period, platforms and output,
 * then the plan's options with their credits. The owner picks one; onChange receives what the
 * brief keeps as metadata.plan, or null. Nothing is made or charged here.
 */
export function CreativePlanStep({ onChange }: { onChange: (plan: BriefPlan | null) => void }) {
  const [input, setInput] = useState<PlanQuoteInput>(DEFAULT_PLAN_INPUT);
  const [budget, setBudget] = useState<number | null>(0);
  const [daysText, setDaysText] = useState("7");
  const [plan, setPlan] = useState<CreativePlan | null>(null);
  const [chosen, setChosen] = useState<number | null>(null);

  // The budget is typed in the tenant's currency and converted to KES for the plan engine with
  // treasury's rate (fresh or its last one). With no rate the field falls back to KES and says so.
  const tenantCurrency = useTenantCurrency();
  const needsRate = tenantCurrency.toUpperCase() !== "KES";
  const rateQuery = useQuery({
    queryKey: ["kes-rate", tenantCurrency],
    queryFn: () => tenantProfileApi.kesRate(tenantCurrency),
    enabled: needsRate,
    staleTime: 10 * 60_000,
    retry: false,
  });
  const rate: PlanRateState = !needsRate
    ? { status: "ready", kesPer: 1 }
    : rateQuery.data
      ? { status: "ready", kesPer: rateQuery.data.kes_per }
      : rateQuery.isError
        ? { status: "missing" }
        : { status: "loading" };
  const { currency: budgetCurrency, note: rateNote } = planBudgetCurrency(tenantCurrency, rate);
  const kesPer = budgetCurrency === "KES" ? 1 : rate.status === "ready" ? rate.kesPer : undefined;
  const budgetKES = budgetToKES(budget, budgetCurrency, kesPer);
  const entry: PlanBudgetEntry | undefined = budget != null && kesPer ? { amount: budget, currency: budgetCurrency, kes_per: kesPer } : undefined;
  const quoteInput: PlanQuoteInput = { ...input, ad_budget_kes: budgetKES };

  const rateLoading = budgetCurrency !== "KES" && rate.status === "loading";
  const problems = rateLoading ? [] : planInputProblems(quoteInput);
  const quote = useMutation({
    mutationFn: (body: PlanQuoteInput) => marketingOsApi.planQuote(body),
    onSuccess: (p, body) => {
      setPlan(p);
      setChosen(0);
      onChange(briefPlan(p, 0, body, new Date(), entry));
    },
  });

  // Any change to the inputs makes the quote stale: the owner asks again before choosing.
  const dropQuote = () => {
    if (plan) {
      setPlan(null);
      setChosen(null);
      onChange(null);
    }
  };
  const update = (next: Partial<PlanQuoteInput>) => {
    setInput((cur) => ({ ...cur, ...next }));
    dropQuote();
  };
  const togglePlatform = (value: string, on: boolean) =>
    update({ platforms: on ? [...input.platforms, value] : input.platforms.filter((p) => p !== value) });
  const choose = (i: number) => {
    if (!plan) return;
    setChosen(i);
    onChange(briefPlan(plan, i, quoteInput, new Date(), entry));
  };

  const budgetHint =
    rateNote ??
    (budgetCurrency !== "KES" && Number.isFinite(budgetKES) && budgetKES > 0 && kesPer
      ? `About ${formatBudget(budgetKES, "KES")} at 1 ${budgetCurrency} = ${formatBudget(kesPer, "KES")}. Plans are worked out in KES. 0 for posts without paid ads.`
      : "0 for posts without paid ads.");

  return (
    <div className="space-y-3 rounded-lg border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Ad budget" htmlFor="plan-budget" hint={budgetHint}>
          <MoneyInput
            id="plan-budget"
            currency={budgetCurrency}
            wholeOnly
            min={0}
            value={budget}
            disabled={rateLoading}
            onChange={(v) => {
              setBudget(v);
              dropQuote();
            }}
          />
        </Field>
        <Field label="Period (days)" htmlFor="plan-days">
          <Input
            id="plan-days"
            inputMode="numeric"
            value={daysText}
            onChange={(e) => {
              setDaysText(e.target.value);
              update({ days: e.target.value.trim() === "" ? Number.NaN : Number(e.target.value) });
            }}
          />
        </Field>
      </div>
      <Field label="Where the ads run">
        <div className="flex flex-wrap gap-4">
          {PLAN_PLATFORMS.map((p) => (
            <label key={p.value} className="flex items-center gap-2 text-sm">
              <Checkbox checked={input.platforms.includes(p.value)} onCheckedChange={(v) => togglePlatform(p.value, v === true)} />
              {p.label}
            </label>
          ))}
        </div>
      </Field>
      <Field label="What to make">
        <CapsuleTabs label="What to make" value={input.tier} onChange={(tier: string) => update({ tier })} options={PLAN_TIERS} />
      </Field>
      {problems.length > 0 && (
        <ul className="list-disc pl-5 text-xs text-destructive">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={rateLoading || problems.length > 0 || quote.isPending}
        onClick={() => quote.mutate(quoteInput)}
      >
        {quote.isPending ? "Working it out..." : plan ? "Plan again" : "Get a plan"}
      </Button>
      {quote.isError && <p className="text-xs text-destructive">{apiErrorMessage(quote.error, "Could not work out a plan right now.")}</p>}
      {plan && (
        <div className="space-y-2" role="radiogroup" aria-label="Plan options">
          {plan.max_live_ads > 0 && (
            <p className="text-xs text-muted-foreground">
              The budget can test up to {plan.max_live_ads} live ad{plan.max_live_ads === 1 ? "" : "s"}
              {plan.daily_per_ad_kes ? `, about ${formatBudget(plan.daily_per_ad_kes, "KES")} a day each` : ""}.
            </p>
          )}
          {planOptions(plan).map((o, i) => (
            <label key={`${o.label}-${i}`} className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-2 text-sm">
              <input type="radio" name="creative-plan" className="mt-1" checked={chosen === i} onChange={() => choose(i)} />
              <span>
                <span className="font-medium">
                  {o.label}
                  {i === 0 ? " (recommended)" : ""}
                </span>
                <span className="block text-xs text-muted-foreground">{o.description}</span>
                <span className="block text-xs text-muted-foreground">{optionPriceLine(o, plan.credits_available)}</span>
              </span>
            </label>
          ))}
          {plan.shortfall > 0 && (
            <p className="text-xs text-muted-foreground">
              You are {plan.shortfall} credit{plan.shortfall === 1 ? "" : "s"} short for the recommended plan. You can still save it and buy credits before making the ads.
            </p>
          )}
          {plan.notes?.map((n) => (
            <p key={n} className="text-xs text-muted-foreground">
              {n}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
