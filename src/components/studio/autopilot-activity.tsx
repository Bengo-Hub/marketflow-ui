"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ErrorState, ToneBadge } from "@/components/ui-kit";
import { autopilotApi } from "@/lib/api/autopilot";
import { apiErrorMessage } from "@/lib/api/errors";
import { formatBudget } from "@/lib/money";
import { costPerLead, draftHref, draftStep, runStatus, runTrigger, skipReason, weekIsEmpty } from "@/lib/studio/autopilot-dashboard";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });
/**
 * One ad autopilot's activity (Sprint 20): its drafts waiting for the owner, its last seven days
 * and its recent runs. The scheduled posts with their veto countdown are on the page above.
 * Spend is in the ad account's currency, passed in by the card.
 */
export function AutopilotActivity({ agentId, orgSlug, currency }: { agentId: string; orgSlug: string; currency: string }) {
  const money = { format: (n: number) => formatBudget(n, currency) };
  const dashboard = useQuery({
    queryKey: ["autopilot-agents", agentId, "dashboard"],
    queryFn: () => autopilotApi.dashboard(agentId),
    staleTime: 30_000,
  });
  const runs = useQuery({
    queryKey: ["autopilot-agents", agentId, "runs"],
    queryFn: () => autopilotApi.runs(agentId, 10),
    staleTime: 30_000,
  });

  return (
    <div className="space-y-4 rounded-lg border border-border p-3 text-sm">
      <section aria-labelledby={`pending-${agentId}`} className="space-y-2">
        <h3 id={`pending-${agentId}`} className="font-medium">
          Waiting for you
        </h3>
        {dashboard.isLoading && <p className="text-muted-foreground">Loading.</p>}
        {dashboard.isError && (
          <ErrorState message={apiErrorMessage(dashboard.error, "Could not load this agent's drafts.")} onRetry={() => void dashboard.refetch()} />
        )}
        {dashboard.data && dashboard.data.pending.length === 0 && <p className="text-muted-foreground">Nothing is waiting for your approval.</p>}
        {dashboard.data && dashboard.data.pending.length > 0 && (
          <ul className="space-y-1">
            {dashboard.data.pending.map((d) => (
              <li key={d.version_id} className="flex flex-wrap items-center justify-between gap-2">
                <Link href={draftHref(orgSlug, d)} className="font-medium text-primary hover:underline">
                  {d.title || "Untitled draft"}
                </Link>
                <span className="text-xs text-muted-foreground">
                  {draftStep(d)}, since {when.format(new Date(d.updated_at || d.created_at))}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby={`week-${agentId}`} className="space-y-2">
        <h3 id={`week-${agentId}`} className="font-medium">
          Last 7 days
        </h3>
        {dashboard.data && weekIsEmpty(dashboard.data.week) && <p className="text-muted-foreground">No ads in the last 7 days.</p>}
        {dashboard.data && !weekIsEmpty(dashboard.data.week) && (
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-5">
            <div>
              <dt className="text-xs text-muted-foreground">Ads made</dt>
              <dd>{dashboard.data.week.ads_made}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Credits used</dt>
              <dd>{dashboard.data.week.credits}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Ad spend</dt>
              <dd>{money.format(dashboard.data.week.spend)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Leads</dt>
              <dd>{dashboard.data.week.leads}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Cost per lead</dt>
              <dd>{costPerLead(dashboard.data.week, (n) => money.format(n))}</dd>
            </div>
          </dl>
        )}
      </section>

      <section aria-labelledby={`runs-${agentId}`} className="space-y-2">
        <h3 id={`runs-${agentId}`} className="font-medium">
          Recent runs
        </h3>
        {runs.isLoading && <p className="text-muted-foreground">Loading.</p>}
        {runs.isError && <ErrorState message={apiErrorMessage(runs.error, "Could not load this agent's runs.")} onRetry={() => void runs.refetch()} />}
        {runs.data && runs.data.length === 0 && <p className="text-muted-foreground">No runs yet.</p>}
        {runs.data && runs.data.length > 0 && (
          <ul className="space-y-1">
            {runs.data.map((r) => {
              const s = runStatus(r);
              const why = skipReason(r) || (r.status === "failed" ? r.error_message ?? "" : "");
              const trigger = runTrigger(r);
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-2">
                  <ToneBadge tone={s.tone}>{s.label}</ToneBadge>
                  {r.started_at && <span className="text-xs text-muted-foreground">{when.format(new Date(r.started_at))}</span>}
                  {trigger && <span className="text-xs text-muted-foreground">{trigger}</span>}
                  {why && <span className="text-xs text-muted-foreground">{why}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
