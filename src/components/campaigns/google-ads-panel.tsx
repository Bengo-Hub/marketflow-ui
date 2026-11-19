"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CapsuleTabs, EmptyState, ErrorState, StatusBadge, ToneBadge, humanize } from "@/components/ui-kit";
import { apiErrorMessage } from "@/lib/api/errors";
import { formatMoney } from "@/lib/api/campaigns";
import { GOOGLE_PERIODS, googleAdsApi, periodLabel, type GooglePeriod } from "@/lib/api/google-ads";

/**
 * Google Ads on the Campaigns page: the business's own account results (read only) and which
 * Google Ads conversion action each MarketFlow event is sent to. Shown only once an account is
 * connected in Settings, Integrations.
 */
export function GoogleAdsPanel({ orgSlug, canEdit }: { orgSlug: string; canEdit: boolean }) {
  const accounts = useQuery({ queryKey: ["google-ads-accounts"], queryFn: googleAdsApi.accounts, staleTime: 60_000, retry: 1 });
  const [accountID, setAccountID] = useState("");
  const [period, setPeriod] = useState<GooglePeriod>("LAST_30_DAYS");
  const list = accounts.data ?? [];
  useEffect(() => {
    if (!accountID && list.length > 0) setAccountID(list[0].connected_account_id);
  }, [accountID, list]);

  if (accounts.isLoading || list.length === 0) return null;
  const current = list.find((a) => a.connected_account_id === accountID) ?? list[0];

  return (
    <section className="rounded-xl border bg-card" aria-labelledby="google-ads-heading">
      <div className="flex flex-wrap items-center gap-3 border-b p-4">
        <div className="min-w-0 flex-1">
          <h2 id="google-ads-heading" className="font-semibold">Google Ads</h2>
          <p className="text-sm text-muted-foreground">Results from your own Google Ads account. Manage the campaigns themselves in Google Ads.</p>
        </div>
        {list.length > 1 && (
          <select
            aria-label="Google Ads account"
            className="rounded-md border bg-background px-2 py-1.5 text-sm"
            value={current.connected_account_id}
            onChange={(e) => setAccountID(e.target.value)}
          >
            {list.map((a) => (
              <option key={a.connected_account_id} value={a.connected_account_id}>{a.name}</option>
            ))}
          </select>
        )}
        <CapsuleTabs label="Period" value={period} onChange={(v) => setPeriod(v as GooglePeriod)} options={GOOGLE_PERIODS.map((p) => ({ value: p, label: periodLabel(p) }))} />
      </div>
      {current.status !== "active" ? (
        <p className="p-4 text-sm text-destructive">
          This account needs connecting again. <Link className="underline" href={`/${orgSlug}/settings/integrations`}>Open Integrations</Link>
        </p>
      ) : (
        <>
          <Results id={current.connected_account_id} period={period} />
          <Mapping id={current.connected_account_id} canEdit={canEdit} />
        </>
      )}
    </section>
  );
}

function Results({ id, period }: { id: string; period: GooglePeriod }) {
  const q = useQuery({ queryKey: ["google-ads-campaigns", id, period], queryFn: () => googleAdsApi.campaigns(id, period), staleTime: 5 * 60_000, retry: 1 });
  if (q.isLoading) return <p className="p-4 text-sm text-muted-foreground">Reading Google Ads…</p>;
  if (q.isError) return <div className="p-4"><ErrorState message={`Google Ads results could not be read: ${apiErrorMessage(q.error, "try again shortly")}`} onRetry={() => q.refetch()} /></div>;
  const rows = q.data?.rows ?? [];
  if (rows.length === 0) {
    return <div className="p-4"><EmptyState icon={<BarChart3 />} title="No campaign activity" description={`Nothing ran in this period (${periodLabel(period).toLowerCase()}).`} /></div>;
  }
  const cur = q.data?.currency;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-4 py-2 font-medium">Campaign</th>
            <th className="px-4 py-2 text-right font-medium">Impressions</th>
            <th className="px-4 py-2 text-right font-medium">Clicks</th>
            <th className="px-4 py-2 text-right font-medium">Conversions</th>
            <th className="px-4 py-2 text-right font-medium">Cost</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((c) => (
            <tr key={c.id}>
              <td className="px-4 py-2">
                <p className="font-medium">{c.name}</p>
                <div className="mt-1 flex gap-1.5"><StatusBadge status={c.status.toLowerCase()} /><ToneBadge>{humanize(c.channel.toLowerCase())}</ToneBadge></div>
              </td>
              <td className="px-4 py-2 text-right tabular">{c.impressions.toLocaleString()}</td>
              <td className="px-4 py-2 text-right tabular">{c.clicks.toLocaleString()}</td>
              <td className="px-4 py-2 text-right tabular">{c.conversions.toLocaleString(undefined, { maximumFractionDigits: 1 })}</td>
              <td className="px-4 py-2 text-right tabular">{formatMoney(c.cost, cur)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Mapping({ id, canEdit }: { id: string; canEdit: boolean }) {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["google-ads-actions", id], queryFn: () => googleAdsApi.conversionActions(id), staleTime: 5 * 60_000, retry: 1 });
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const save = useMutation({
    mutationFn: (m: Record<string, string>) => googleAdsApi.setMapping(id, m),
    onSuccess: () => {
      toast.success("Saved. Matching leads are now sent to Google Ads as conversions.");
      setDraft(null);
      qc.invalidateQueries({ queryKey: ["google-ads-actions", id] });
      qc.invalidateQueries({ queryKey: ["google-ads-accounts"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "The mapping could not be saved.")),
  });
  if (q.isLoading || q.isError || !q.data) return null;
  const mapping = draft ?? q.data.mapping ?? {};
  return (
    <div className="space-y-3 border-t p-4">
      <div>
        <h3 className="text-sm font-semibold">Send leads back to Google Ads</h3>
        <p className="text-xs text-muted-foreground">
          When a lead that came from a Google ad books or buys, MarketFlow reports it to the conversion action you choose, so Google can show which ads work.
          {q.data.data.length === 0 && " Create an offline (import from clicks) conversion action in Google Ads first."}
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {q.data.events.map((ev) => (
          <label key={ev} className="space-y-1 text-sm">
            <span className="font-medium">{ev}</span>
            <select
              className="w-full rounded-md border bg-background px-2 py-1.5"
              disabled={!canEdit || q.data.data.length === 0}
              value={mapping[ev] ?? ""}
              onChange={(e) => setDraft({ ...mapping, [ev]: e.target.value })}
            >
              <option value="">Do not send</option>
              {q.data.data.map((a) => (
                <option key={a.resource_name} value={a.resource_name}>{a.name}</option>
              ))}
            </select>
          </label>
        ))}
      </div>
      {canEdit && draft && (
        <Button size="sm" onClick={() => save.mutate(draft)} disabled={save.isPending}>Save</Button>
      )}
    </div>
  );
}
