"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Download, Loader2, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { SearchableCombobox } from "@bengo-hub/shared-ui-lib/combobox";
import type { DataTableColumn } from "@bengo-hub/shared-ui-lib/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CapsuleTabs, EmptyState, ListTable, PageHeader, StatusBadge, ToneBadge, humanize } from "@/components/ui-kit";
import { useDashboard } from "@/hooks/use-analytics";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useLeads } from "@/hooks/use-leads";
import { apiErrorMessage } from "@/lib/api/errors";
import { LEAD_STATUSES, leadName, leadsApi, type Lead, type LeadFilters } from "@/lib/api/leads";
import { datedFilename, saveBlob } from "@/lib/download";

const dateFmt = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" });

export default function LeadsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [status, setStatus] = useState<string>("all");
  const [source, setSource] = useState("");
  const [search, setSearch] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);
  const q = useDebouncedValue(search.trim(), 300);

  const filters: LeadFilters = useMemo(() => ({ q, status, source, from, to }), [q, status, source, from, to]);
  const leads = useLeads(filters, page);
  // Source choices come from the sources leads actually arrived from (last 90 days).
  const sources = useDashboard(90);
  const sourceOptions = (sources.data?.by_source ?? []).filter((s) => s.source !== "other").map((s) => ({ value: s.source, label: humanize(s.source) }));

  const rows = leads.data?.data ?? [];
  const total = leads.data?.total ?? 0;
  const hasFilters = !!(q || status !== "all" || source || from || to);
  const reset = () => {
    setStatus("all");
    setSource("");
    setSearch("");
    setFrom("");
    setTo("");
    setPage(1);
  };
  const set = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(1);
  };

  // Filters run on the server (search, status, source and dates), so columns only render.
  const columns: DataTableColumn<Lead>[] = [
    {
      key: "name",
      header: "Lead",
      primary: true,
      accessor: (l) => leadName(l),
      render: (l) => (
        <Link href={`/${orgSlug}/leads/${l.id}`} className="font-medium text-foreground hover:text-primary" onClick={(e) => e.stopPropagation()}>
          {leadName(l)}
          <span className="block text-xs font-normal text-muted-foreground">{[l.email, l.phone].filter(Boolean).join("  ") || "No contact details"}</span>
        </Link>
      ),
    },
    {
      key: "source",
      header: "Source",
      accessor: (l) => l.source,
      render: (l) => (
        <span>
          <ToneBadge>{humanize(l.source)}</ToneBadge>
          {l.utm_campaign && <span className="mt-1 block truncate text-xs text-muted-foreground">Campaign: {l.utm_campaign}</span>}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      accessor: (l) => l.status,
      render: (l) => (
        <span className="inline-flex flex-wrap gap-1.5">
          <StatusBadge status={l.status} />
          {l.lead_type === "recruit" && <ToneBadge tone="primary">Recruit</ToneBadge>}
        </span>
      ),
    },
    { key: "score", header: "Score", align: "right", mobileAction: true, accessor: (l) => l.score, render: (l) => <span className="font-semibold tabular">{l.score}</span> },
    { key: "created_at", header: "Received", accessor: (l) => l.created_at, render: (l) => <span className="text-muted-foreground tabular">{dateFmt.format(new Date(l.created_at))}</span> },
  ];

  async function exportCsv() {
    setExporting(true);
    try {
      saveBlob(await leadsApi.exportCsv(filters), datedFilename("leads", "csv"));
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not export leads"));
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Users />}
        title="Leads"
        description={leads.isLoading ? "Loading..." : `${total.toLocaleString()} ${hasFilters ? "matching" : "in total"}`}
        actions={
          <Button variant="outline" onClick={exportCsv} disabled={exporting || total === 0}>
            {exporting ? <Loader2 className="animate-spin" /> : <Download />}
            Export CSV
          </Button>
        }
      />

      <div className="space-y-3">
        <CapsuleTabs
          label="Filter leads by status"
          value={status}
          onChange={set(setStatus)}
          options={[{ value: "all", label: "All" }, ...LEAD_STATUSES.map((s) => ({ value: s, label: humanize(s) }))]}
        />
        <div className="flex flex-wrap items-end gap-3">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input aria-label="Search leads" value={search} onChange={(e) => set(setSearch)(e.target.value)} placeholder="Search name, email or phone" className="pl-9" />
          </div>
          <div className="w-full sm:w-48">
            <SearchableCombobox
              options={sourceOptions}
              value={source}
              onChange={(v: string) => set(setSource)(v)}
              placeholder="Any source"
              clearable
            />
          </div>
          <div className="grid w-full grid-cols-2 gap-3 sm:w-auto">
            <label className="text-xs font-medium text-muted-foreground">
              From
              <Input type="date" className="mt-1 sm:w-40" value={from} max={to || undefined} onChange={(e) => set(setFrom)(e.target.value)} />
            </label>
            <label className="text-xs font-medium text-muted-foreground">
              To
              <Input type="date" className="mt-1 sm:w-40" value={to} min={from || undefined} onChange={(e) => set(setTo)(e.target.value)} />
            </label>
          </div>
          {hasFilters && (
            <Button variant="ghost" onClick={reset}>
              <X />
              Clear
            </Button>
          )}
        </div>
      </div>

      <ListTable<Lead>
        columns={columns}
        rows={rows}
        rowKey={(l) => l.id}
        loading={leads.isLoading}
        error={leads.isError}
        onRetry={() => void leads.refetch()}
        storageKey="mf-leads-columns"
        onRowClick={(l) => router.push(`/${orgSlug}/leads/${l.id}`)}
        paging={{ page, limit: leads.data?.limit || 20, total, onPage: setPage }}
        emptyState={
          <EmptyState
            icon={<Users />}
            title={hasFilters ? "No leads match these filters" : "No leads yet"}
            description={hasFilters ? "Change or clear the filters." : "Leads from your public page, funnels, chat and lead forms show up here."}
            action={hasFilters ? <Button variant="outline" onClick={reset}>Clear filters</Button> : undefined}
          />
        }
      />
    </div>
  );
}
