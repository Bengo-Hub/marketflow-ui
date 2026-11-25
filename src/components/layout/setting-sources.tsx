"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { ErrorState, GlassPanel, ToneBadge } from "@/components/ui-kit";
import { useAdminLocked } from "@/hooks/use-access";
import { apiErrorMessage } from "@/lib/api/errors";
import { tenantProfileApi, type SettingSource } from "@/lib/api/tenant-profile";

const when = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

/** Settings another Codevertex service owns: where each comes from, when it was last read, Sync now. */
export function SettingSources() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const key = ["setting-sources", orgSlug];
  const locked = useAdminLocked();
  const list = useQuery({ queryKey: key, queryFn: tenantProfileApi.sources, staleTime: 60_000 });
  const sync = useMutation({
    mutationFn: (k: string) => tenantProfileApi.syncSource(k),
    onSuccess: (s) => {
      qc.setQueryData<SettingSource[]>(key, (old) => old?.map((x) => (x.key === s.key ? s : x)));
      toast.success(`${s.name} synced`);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not sync")),
  });

  return (
    <GlassPanel title="Synced from your other Codevertex services" description="These are changed where they live, not here.">
      {list.isError && <ErrorState message="Could not load the sources." onRetry={() => void list.refetch()} />}
      {list.isLoading && <div className="h-32 animate-pulse rounded-xl bg-muted" aria-busy />}
      <ul className="divide-y divide-border">
        {list.data?.map((s) => (
          <li key={s.key} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 font-medium">
                {s.name} <ToneBadge>{s.from}</ToneBadge>
                {!s.ok && <ToneBadge tone="warning">Not answering</ToneBadge>}
              </p>
              {s.detail && <p className="break-words">{s.detail}</p>}
              <p className="text-xs text-muted-foreground">
                {s.last_sync ? `Last synced ${when.format(new Date(s.last_sync))}. ` : ""}
                {s.updates}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              disabled={locked || (sync.isPending && sync.variables === s.key)}
              onClick={() => sync.mutate(s.key)}
              aria-label={`Sync ${s.name} now`}
            >
              <RefreshCw /> {sync.isPending && sync.variables === s.key ? "Syncing..." : "Sync now"}
            </Button>
          </li>
        ))}
      </ul>
    </GlassPanel>
  );
}
