"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Download, Loader2, Search, Users, X } from "lucide-react";
import { toast } from "sonner";
import { SearchableCombobox } from "@bengo-hub/shared-ui-lib/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CapsuleTabs, EmptyState, ErrorState, Pager, PageHeader, StatusBadge, ToneBadge, humanize } from "@/components/ui-kit";
import { useDashboard } from "@/hooks/use-analytics";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useLeads } from "@/hooks/use-leads";
import { apiErrorMessage } from "@/lib/api/errors";
import { LEAD_STATUSES, leadName, leadsApi, type LeadFilters } from "@/lib/api/leads";
import { datedFilename, saveBlob } from "@/lib/download";

const dateFmt = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" });

export default function LeadsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
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

      <div className="glass overflow-hidden rounded-[1.25rem]">
        {leads.isError && <ErrorState message="Could not load leads." onRetry={() => void leads.refetch()} />}
        {leads.isLoading && (
          <div className="space-y-2 p-4" aria-busy>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}
        {!leads.isLoading && !leads.isError && rows.length === 0 && (
          <EmptyState
            icon={<Users />}
            title={hasFilters ? "No leads match these filters" : "No leads yet"}
            description={hasFilters ? "Change or clear the filters." : "Leads from your public page, funnels, chat and lead forms show up here."}
            action={hasFilters ? <Button variant="outline" onClick={reset}>Clear filters</Button> : undefined}
          />
        )}
        {rows.length > 0 && (
          <ul className="divide-y divide-border md:hidden">
            {rows.map((l) => (
              <li key={l.id}>
                <Link href={`/${orgSlug}/leads/${l.id}`} className="flex items-start justify-between gap-3 p-4 active:bg-accent/60">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{leadName(l)}</p>
                    <p className="truncate text-xs text-muted-foreground">{[l.email, l.phone].filter(Boolean).join("  ") || "No contact details"}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <StatusBadge status={l.status} />
                      <ToneBadge>{humanize(l.source)}</ToneBadge>
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-display text-lg font-semibold tabular">{l.score}</p>
                    <p className="text-xs text-muted-foreground tabular">{dateFmt.format(new Date(l.created_at))}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-4 py-3">Lead</th>
                  <th className="px-4 py-3">Source</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Score</th>
                  <th className="px-4 py-3">Received</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((l) => (
                  <tr key={l.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <Link href={`/${orgSlug}/leads/${l.id}`} className="font-medium text-foreground hover:text-primary">
                        {leadName(l)}
                      </Link>
                      <p className="text-xs text-muted-foreground">{[l.email, l.phone].filter(Boolean).join("  ") || "No contact details"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <ToneBadge>{humanize(l.source)}</ToneBadge>
                      {l.utm_campaign && <p className="mt-1 truncate text-xs text-muted-foreground">Campaign: {l.utm_campaign}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={l.status} />
                      {l.lead_type === "recruit" && <ToneBadge tone="primary" className="ml-1.5">Recruit</ToneBadge>}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold tabular">{l.score}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular">{dateFmt.format(new Date(l.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {leads.data && (
          <div className="px-4 pb-4">
            <Pager page={page} limit={leads.data.limit || 20} total={total} onPage={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
