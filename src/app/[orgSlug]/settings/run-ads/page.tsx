"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Megaphone, RotateCcw, Save } from "lucide-react";
import { MoneyInput } from "@bengo-hub/shared-ui-lib/payments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ErrorState, Field, GlassPanel, PageHeader } from "@/components/ui-kit";
import { useUpdateTenantProfile } from "@/hooks/use-tenant-profile";
import { getRunAdsSettings, type RunAdsSettingsResponse, type RunPlatform } from "@/lib/api/ads";
import { formatBudget } from "@/lib/money";
import {
  PLATFORM_LABEL,
  RUN_PLATFORMS,
  TIER_LABEL,
  amountsCurrency,
  runAdsPatch,
  runAdsSettingsProblems,
  type RunAdsSettingsForm,
} from "@/lib/ads/run-ads";

const TIERS = ["low", "recommended", "high"] as const;

/**
 * Run ads defaults (owner, 2026-11-24): what a new Run ads plan starts with. Platforms, the budget
 * tier or the business's own daily amounts, the days and a total cap. The platform's rule of thumb
 * and the TikTok mode are shown read only; the owner or an admin can change the rest.
 */
export default function RunAdsSettingsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const q = useQuery({ queryKey: ["run-ads-settings", orgSlug], queryFn: getRunAdsSettings, staleTime: 30_000 });
  if (q.error) return <ErrorState message="Could not load the Run ads settings." onRetry={() => void q.refetch()} />;
  if (q.isLoading || !q.data) return <div className="glass mx-auto h-64 max-w-3xl animate-pulse rounded-[1.25rem]" aria-busy />;
  return <RunAdsForm key={q.dataUpdatedAt} data={q.data} />;
}

function formFrom(v: RunAdsSettingsResponse["effective"], tenantCurrency: string): RunAdsSettingsForm {
  return {
    platforms: [...v.platforms], tier: v.tier, daily_budget: { ...v.daily_budget }, days: v.days,
    total_cap: v.total_cap_set ? v.total_cap : null,
    currency: v.currency || tenantCurrency, amounts_currency: amountsCurrency(v, tenantCurrency),
  };
}

function RunAdsForm({ data }: { data: RunAdsSettingsResponse }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const save = useUpdateTenantProfile();
  const p = data.platform;
  const [v, setV] = useState<RunAdsSettingsForm>(() => formFrom(data.effective, data.currency));
  const cur = v.amounts_currency;
  const [daysText, setDaysText] = useState(String(data.effective.days));
  const problems = runAdsSettingsProblems(v);
  const disabled = !data.can_edit;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problems.length > 0 || disabled) return;
    save.mutate(
      { metadata: { run_ads: runAdsPatch(v, p) } },
      { onSuccess: () => void qc.invalidateQueries({ queryKey: ["run-ads-settings", orgSlug] }) },
    );
  };
  const resetToDefaults = () => {
    setV(formFrom(p, data.currency));
    setDaysText(String(p.days));
  };
  const togglePlatform = (pl: RunPlatform) =>
    setV((c) => ({ ...c, platforms: c.platforms.includes(pl) ? c.platforms.filter((x) => x !== pl) : [...c.platforms, pl] }));

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6" noValidate>
      <PageHeader
        icon={<Megaphone />}
        title="Run ads"
        description="What a new Run ads plan starts with after you approve a video. You can still change every value in the plan before you confirm it."
      />

      {disabled && (
        <p className="rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
          Only the account owner or an admin can change these settings.
        </p>
      )}

      <GlassPanel title="Platforms" description="The platforms switched on in a new plan.">
        <div className="space-y-2 px-5 pb-5 pt-3">
          {RUN_PLATFORMS.map((pl) => (
            <label key={pl} className="flex min-h-10 items-center gap-3 text-sm">
              <input type="checkbox" checked={v.platforms.includes(pl)} disabled={disabled} onChange={() => togglePlatform(pl)} />
              {PLATFORM_LABEL[pl]}
            </label>
          ))}
          <p className="text-xs text-muted-foreground">
            TikTok runs {p.tiktok_mode === "api" ? "through TikTok's Marketing API where it is available, otherwise as guided steps" : "as guided steps: MarketFlow gives you the links and you set it up on TikTok"}. This is a MarketFlow setting.
          </p>
        </div>
      </GlassPanel>

      <GlassPanel title="Budget" description={`Amounts are in ${cur}. An own daily amount for a platform replaces the tier for that platform.`}>
        <div className="space-y-5 px-5 pb-5 pt-3">
          <Field
            label="Ads currency"
            htmlFor="ra-currency"
            hint={`Plans are shown in this currency with ${data.currency} beside it, converted with the day's rate. Each platform is still sent its own ad account's currency.${cur !== v.currency ? ` Your amounts below stay in ${cur} and are converted.` : ""}`}
          >
            <select
              id="ra-currency"
              className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm sm:max-w-48"
              value={v.currency}
              disabled={disabled}
              onChange={(e) => {
                const next = e.target.value;
                // Amounts already entered keep their currency; with none, new ones are in the ads currency.
                setV((c) => ({
                  ...c,
                  currency: next,
                  amounts_currency: c.total_cap === null && Object.values(c.daily_budget).every((n) => !n) ? next : c.amounts_currency,
                }));
              }}
            >
              {[...new Set([v.currency, ...(data.currencies ?? [])])].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Default tier</legend>
            <div className="flex flex-wrap gap-1.5">
              {TIERS.map((t) => (
                <button
                  key={t}
                  type="button"
                  disabled={disabled}
                  aria-pressed={v.tier === t}
                  onClick={() => setV((c) => ({ ...c, tier: t }))}
                  className={`min-h-9 rounded-full border px-3 text-sm transition-colors disabled:opacity-60 ${
                    v.tier === t ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background/60 text-muted-foreground hover:border-primary/50"
                  }`}
                >
                  {TIER_LABEL[t]}
                </button>
              ))}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">MarketFlow default: {TIER_LABEL[p.tier] ?? p.tier}.</p>
          </fieldset>

          <div className="grid gap-4 sm:grid-cols-3">
            {RUN_PLATFORMS.map((pl) => (
              <Field key={pl} label={`Own daily amount, ${PLATFORM_LABEL[pl]}`} htmlFor={`ra-daily-${pl}`} hint="Optional. Leave empty to use the tier.">
                <MoneyInput
                  id={`ra-daily-${pl}`}
                  currency={cur}
                  wholeOnly
                  min={0}
                  disabled={disabled}
                  value={v.daily_budget[pl] ?? null}
                  onChange={(n) => setV((c) => ({ ...c, daily_budget: { ...c.daily_budget, [pl]: n && n > 0 ? n : null } }))}
                />
              </Field>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Days" htmlFor="ra-days" hint={`1 to 90. MarketFlow default: ${p.days}.`}>
              <Input
                id="ra-days"
                type="number"
                min={1}
                max={90}
                value={daysText}
                disabled={disabled}
                onChange={(e) => {
                  setDaysText(e.target.value);
                  setV((c) => ({ ...c, days: Number(e.target.value) }));
                }}
              />
            </Field>
            <Field
              label="Total cap"
              htmlFor="ra-cap"
              hint={`The most one plan may spend on all platforms together. 0 is no cap. Leave it empty to use MarketFlow's default (${p.total_cap_kes ? formatBudget(p.total_cap_kes, "KES") : "no cap"}).`}
            >
              <MoneyInput id="ra-cap" currency={cur} wholeOnly min={0} disabled={disabled} value={v.total_cap} onChange={(n) => setV((c) => ({ ...c, total_cap: n === null || n === undefined ? null : Math.max(0, n) }))} />
            </Field>
          </div>
        </div>
      </GlassPanel>

      <GlassPanel
        title="MarketFlow rule of thumb"
        description="Daily amounts in KES used only when a platform gives no estimate of its own and you have no past results there. A rule of thumb, not an estimate. MarketFlow sets these; they are shown here read only."
      >
        <div className="overflow-x-auto px-5 pb-5 pt-3">
          {Object.keys(p.rule_of_thumb_kes ?? {}).length === 0 ? (
            <p className="text-sm text-muted-foreground">No rule of thumb is set, so a plan asks you for an amount when a platform gives no estimate.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground">
                  <th className="py-1 pr-3 font-medium">Platform</th>
                  {TIERS.map((t) => (
                    <th key={t} className="py-1 pr-3 font-medium">{TIER_LABEL[t]}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {RUN_PLATFORMS.filter((pl) => p.rule_of_thumb_kes?.[pl]).map((pl) => (
                  <tr key={pl} className="border-t border-border">
                    <td className="py-1 pr-3">{PLATFORM_LABEL[pl]}</td>
                    {TIERS.map((t) => {
                      const n = p.rule_of_thumb_kes[pl]?.[t];
                      return (
                        <td key={t} className="py-1 pr-3">{typeof n === "number" ? `${formatBudget(n, "KES")} per day` : "Not set"}</td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </GlassPanel>

      {problems.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-destructive" role="alert">
          {problems.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}

      {!disabled && (
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="h-4 w-4" />
            Use MarketFlow defaults
          </Button>
          <Button type="submit" disabled={save.isPending || problems.length > 0}>
            <Save className="h-4 w-4" />
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </form>
  );
}
