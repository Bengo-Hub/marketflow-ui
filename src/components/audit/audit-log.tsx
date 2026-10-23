"use client";

import { useState } from "react";
import { ScrollText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { EmptyState, ErrorState, Pager, humanize } from "@/components/ui-kit";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { AuditEntry } from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/types";
import type { UseQueryResult } from "@tanstack/react-query";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

/** Audit trail list with an event filter, shared by the tenant activity log and the platform console. */
export function AuditLog({
  useEntries,
  emptyText,
}: {
  useEntries: (event: string, page: number) => UseQueryResult<Paginated<AuditEntry>>;
  emptyText: string;
}) {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const event = useDebouncedValue(filter.trim(), 300);
  const q = useEntries(event, page);
  const rows = q.data?.data ?? [];

  return (
    <div className="glass rounded-[1.25rem] p-5">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          aria-label="Filter by event name"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
          placeholder="Filter by exact event name, e.g. lead.created"
          className="pl-9"
        />
      </div>

      {q.isError && <ErrorState onRetry={() => void q.refetch()} />}
      {q.isLoading && (
        <div className="mt-4 space-y-2" aria-busy>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}
      {!q.isLoading && !q.isError && rows.length === 0 && <EmptyState icon={<ScrollText />} title="Nothing recorded yet" description={emptyText} />}

      {rows.length > 0 && (
        <ul className="mt-4 divide-y divide-border">
          {rows.map((e) => (
            <li key={e.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:gap-4">
              <span className="w-44 shrink-0 text-xs text-muted-foreground tabular">{when.format(new Date(e.occurred_at))}</span>
              <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 font-mono text-xs text-accent-foreground">{e.event}</span>
              <span className="min-w-0 flex-1 truncate text-sm">
                {e.subject_type ? `${humanize(e.subject_type)} ${e.subject_id ? e.subject_id.slice(0, 8) : ""}` : ""}
              </span>
              <span className="truncate text-xs text-muted-foreground sm:max-w-[14rem]">{e.actor || "System"}</span>
            </li>
          ))}
        </ul>
      )}
      {q.data && <Pager page={page} limit={q.data.limit || 25} total={q.data.total} onPage={setPage} />}
    </div>
  );
}
