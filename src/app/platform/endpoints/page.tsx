"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Plug, RefreshCw, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, GlassPanel, PageHeader, ToneBadge } from "@/components/ui-kit";
import { countByStatus, endpointsApi, type DiscoveredEndpoint, type EndpointStatus } from "@/lib/api/endpoints";
import { apiErrorMessage } from "@/lib/api/errors";

const KEY = ["admin", "endpoints"];
const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });
const tone: Record<EndpointStatus, "warning" | "success" | "neutral"> = { candidate: "warning", approved: "success", rejected: "neutral" };
const label: Record<EndpointStatus, string> = { candidate: "Waiting", approved: "Offered to Vera", rejected: "Rejected" };

/**
 * Endpoint discovery (Sprint 25, decision 61): read-only, marketing-safe routes found in the other
 * services' OpenAPI specs. Writes and sensitive reads never reach this list; nothing reaches Vera
 * until it is approved here.
 */
export default function EndpointsPage() {
  const qc = useQueryClient();
  const list = useQuery({ queryKey: KEY, queryFn: endpointsApi.list });
  const decide = useMutation({
    mutationFn: (v: { service: string; e: DiscoveredEndpoint; status: EndpointStatus }) => endpointsApi.decide(v.service, v.e, v.status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: KEY }),
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the decision")),
  });
  const scan = useMutation({
    mutationFn: endpointsApi.scan,
    onSuccess: (r) => {
      toast.success(r.new_candidates ? `${r.new_candidates} new route${r.new_candidates === 1 ? "" : "s"} to review` : "No new routes");
      if (r.failed.length) toast.warning(`Could not read: ${r.failed.join(", ")}`);
      void qc.invalidateQueries({ queryKey: KEY });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "The scan failed")),
  });
  const counts = countByStatus(list.data);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Service data for Vera"
        icon={<Plug />}
        description="Read-only routes found in the other services each week. Payments, users, staff, logs and every write are filtered out before they get here. Approve a route to let Vera read it for a business."
        actions={
          <Button variant="outline" onClick={() => scan.mutate()} disabled={scan.isPending}>
            <RefreshCw className={scan.isPending ? "animate-spin" : undefined} /> Scan now
          </Button>
        }
      />

      {list.isError && <ErrorState message={apiErrorMessage(list.error, "Could not load the routes.")} onRetry={() => void list.refetch()} />}

      {list.data && (
        <p className="text-sm text-muted-foreground">
          {counts.candidate} waiting, {counts.approved} offered, {counts.rejected} rejected.
        </p>
      )}

      {list.isLoading && <div className="h-40 animate-pulse rounded-[1.25rem] bg-muted" />}

      {list.data?.map((s) => (
        <GlassPanel key={s.service} title={s.service} description={`${s.endpoints.length} route${s.endpoints.length === 1 ? "" : "s"}`}>
          {s.endpoints.length === 0 ? (
            <EmptyState title="Nothing found yet" description="This service's spec has no marketing-safe read routes, or it has not been scanned." />
          ) : (
            <ul className="divide-y divide-border">
              {s.endpoints.map((e) => (
                <li key={e.method + e.path} className="flex flex-col gap-3 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="break-all font-mono text-sm">{e.path}</p>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <ToneBadge tone={tone[e.status]}>{label[e.status]}</ToneBadge>
                      {e.summary && <span>{e.summary}</span>}
                      {e.tags?.length ? <span>{e.tags.join(", ")}</span> : null}
                      <span>First seen {when.format(new Date(e.first_seen))}</span>
                      {e.decided_by && <span>by {e.decided_by}</span>}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    {e.status !== "approved" && (
                      <Button size="sm" disabled={decide.isPending} onClick={() => decide.mutate({ service: s.service, e, status: "approved" })}>
                        <Check /> Approve
                      </Button>
                    )}
                    {e.status !== "rejected" && (
                      <Button size="sm" variant="outline" disabled={decide.isPending} onClick={() => decide.mutate({ service: s.service, e, status: "rejected" })}>
                        <X /> Reject
                      </Button>
                    )}
                    {e.status !== "candidate" && (
                      <Button size="sm" variant="ghost" disabled={decide.isPending} onClick={() => decide.mutate({ service: s.service, e, status: "candidate" })}>
                        <Undo2 /> Undo
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </GlassPanel>
      ))}
    </div>
  );
}
