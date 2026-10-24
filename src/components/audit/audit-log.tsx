"use client";

import { useState } from "react";
import { ScrollText, Search } from "lucide-react";
import type { UseQueryResult } from "@tanstack/react-query";
import type { DataTableColumn } from "@bengo-hub/shared-ui-lib/data-table";
import { Input } from "@/components/ui/input";
import { EmptyState, ListTable, humanize } from "@/components/ui-kit";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import type { AuditEntry } from "@/lib/api/admin";
import type { Paginated } from "@/lib/api/types";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

const columns: DataTableColumn<AuditEntry>[] = [
  { key: "occurred_at", header: "When", accessor: (e) => e.occurred_at, render: (e) => <span className="whitespace-nowrap text-xs text-muted-foreground tabular">{when.format(new Date(e.occurred_at))}</span> },
  {
    key: "event",
    header: "Event",
    primary: true,
    accessor: (e) => e.event,
    render: (e) => <span className="w-fit rounded-full bg-accent px-2.5 py-0.5 font-mono text-xs text-accent-foreground">{e.event}</span>,
  },
  {
    key: "subject",
    header: "About",
    accessor: (e) => (e.subject_type ? `${humanize(e.subject_type)} ${e.subject_id?.slice(0, 8) ?? ""}` : ""),
  },
  { key: "actor", header: "By", accessor: (e) => e.actor || "System", render: (e) => <span className="truncate text-xs text-muted-foreground">{e.actor || "System"}</span> },
  {
    key: "payload",
    header: "Details",
    hideBelow: "lg",
    defaultHidden: true,
    accessor: (e) => (e.payload ? JSON.stringify(e.payload) : ""),
    render: (e) => <span className="block max-w-md truncate font-mono text-xs text-muted-foreground">{e.payload ? JSON.stringify(e.payload) : ""}</span>,
  },
];

/** Audit trail with an event filter, shared by the tenant activity log and the platform console. */
export function AuditLog({
  useEntries,
  emptyText,
  storageKey = "mf-audit-columns",
}: {
  useEntries: (event: string, page: number) => UseQueryResult<Paginated<AuditEntry>>;
  emptyText: string;
  storageKey?: string;
}) {
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(1);
  const event = useDebouncedValue(filter.trim(), 300);
  const q = useEntries(event, page);

  return (
    <ListTable<AuditEntry>
      columns={columns}
      rows={q.data?.data ?? []}
      rowKey={(e) => e.id}
      loading={q.isLoading}
      error={q.isError}
      onRetry={() => void q.refetch()}
      storageKey={storageKey}
      showExportCsv
      exportFileName="activity-log"
      paging={{ page, limit: q.data?.limit || 25, total: q.data?.total ?? 0, onPage: setPage }}
      toolbar={
        <div className="relative w-full max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Filter by event name"
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1);
            }}
            placeholder="Exact event name, e.g. lead.created"
            className="pl-9"
          />
        </div>
      }
      emptyState={<EmptyState icon={<ScrollText />} title="Nothing recorded yet" description={emptyText} />}
    />
  );
}
