"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { STALE_TIMES } from "@/app/providers";
import { Download, Info, Loader2 } from "lucide-react";
import { format } from "date-fns";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  converted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

const SOURCE_OPTIONS = [
  { value: "all", label: "All Sources" },
  { value: "manual", label: "Manual" },
  { value: "funnel", label: "Funnel" },
  { value: "meta", label: "Meta" },
  { value: "google", label: "Google" },
  { value: "tiktok", label: "TikTok" },
  { value: "widget", label: "Widget" },
  { value: "public", label: "Public" },
];

const sourceColors: Record<string, string> = {
  manual: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  funnel: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  meta: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  google: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200",
  tiktok: "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200",
  widget: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200",
  public: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
};

type Lead = {
  id: string;
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  source: string;
  lead_type: string;
  status: string;
  score: number;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  created_at: string;
};

const CSV_COLUMNS = [
  "email",
  "phone",
  "first_name",
  "last_name",
  "source",
  "lead_type",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "created_at",
] as const;

function buildParams({
  statusFilter,
  sourceFilter,
  dateFrom,
  dateTo,
  page,
  limit,
}: {
  statusFilter: string;
  sourceFilter: string;
  dateFrom: string;
  dateTo: string;
  page: number;
  limit: number;
}): URLSearchParams {
  const params = new URLSearchParams({ limit: String(limit), offset: String(page * limit) });
  if (statusFilter !== "all") params.set("status", statusFilter);
  if (sourceFilter !== "all") params.set("source", sourceFilter);
  if (dateFrom) params.set("from", dateFrom);
  if (dateTo) params.set("to", dateTo);
  return params;
}

function escapeCsvField(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

function leadsToCsv(leads: Lead[]): string {
  const header = CSV_COLUMNS.join(",");
  const rows = leads.map((lead) =>
    CSV_COLUMNS.map((col) => escapeCsvField(String((lead as Record<string, unknown>)[col] ?? ""))).join(","),
  );
  return [header, ...rows].join("\n");
}

function downloadBlob(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [detailLead, setDetailLead] = useState<Lead | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["leads", statusFilter, sourceFilter, dateFrom, dateTo, page],
    queryFn: async () => {
      const params = buildParams({ statusFilter, sourceFilter, dateFrom, dateTo, page, limit: 20 });
      const res = await apiClient.get(`/api/v1/leads?${params}`);
      return res.data;
    },
    staleTime: STALE_TIMES.OPERATIONAL,
  });

  const handleExportCsv = useCallback(async () => {
    setExporting(true);
    try {
      // Fetch all leads matching current filters (no pagination)
      const params = buildParams({ statusFilter, sourceFilter, dateFrom, dateTo, page: 0, limit: 10000 });
      const res = await apiClient.get(`/api/v1/leads?${params}`);
      const allLeads: Lead[] = res.data?.data ?? [];
      const csv = leadsToCsv(allLeads);
      const timestamp = format(new Date(), "yyyy-MM-dd_HHmm");
      downloadBlob(csv, `leads_export_${timestamp}.csv`);
    } catch {
      // Silently fail — toast would be better but we avoid adding deps
    } finally {
      setExporting(false);
    }
  }, [statusFilter, sourceFilter, dateFrom, dateTo]);

  function resetFilters() {
    setStatusFilter("all");
    setSourceFilter("all");
    setDateFrom("");
    setDateTo("");
    setPage(0);
  }

  const hasFilters = statusFilter !== "all" || sourceFilter !== "all" || dateFrom !== "" || dateTo !== "";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">{data?.total ?? 0} total leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExportCsv} disabled={exporting}>
            {exporting ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Download className="mr-1 h-4 w-4" />
            )}
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Status</span>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v ?? "all"); setPage(0); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="new">New</SelectItem>
              <SelectItem value="contacted">Contacted</SelectItem>
              <SelectItem value="qualified">Qualified</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="lost">Lost</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">Source</span>
          <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v ?? "all"); setPage(0); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Filter source" />
            </SelectTrigger>
            <SelectContent>
              {SOURCE_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">From</span>
          <Input
            type="date"
            className="w-40"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs font-medium text-muted-foreground">To</span>
          <Input
            type="date"
            className="w-40"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
          />
        </div>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={resetFilters}>
            Clear filters
          </Button>
        )}
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No leads yet. They will appear here when captured from ads, funnels, or chat.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((lead: Lead) => {
                  const hasUtm = lead.utm_source || lead.utm_medium || lead.utm_campaign;
                  return (
                    <TableRow key={lead.id}>
                      <TableCell className="font-medium">
                        {lead.first_name || lead.last_name
                          ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim()
                          : "--"}
                      </TableCell>
                      <TableCell>{lead.email || "--"}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sourceColors[lead.source] || "bg-gray-100 text-gray-800"}`}
                        >
                          {lead.source}
                        </span>
                      </TableCell>
                      <TableCell>{lead.lead_type}</TableCell>
                      <TableCell>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[lead.status] || ""}`}>
                          {lead.status}
                        </span>
                      </TableCell>
                      <TableCell>{lead.score}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {new Date(lead.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {hasUtm && (
                            <Tooltip>
                              <TooltipTrigger
                                render={<Button variant="ghost" size="sm" className="h-6 w-6 p-0" />}
                              >
                                <Info className="h-3.5 w-3.5 text-muted-foreground" />
                              </TooltipTrigger>
                              <TooltipContent side="left" className="text-xs space-y-1">
                                {lead.utm_source && <div>Source: {lead.utm_source}</div>}
                                {lead.utm_medium && <div>Medium: {lead.utm_medium}</div>}
                                {lead.utm_campaign && <div>Campaign: {lead.utm_campaign}</div>}
                              </TooltipContent>
                            </Tooltip>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-xs"
                            onClick={() => setDetailLead(lead)}
                          >
                            View
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {data?.total > 20 && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Showing {page * 20 + 1}-{Math.min((page + 1) * 20, data.total)} of {data.total}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={(page + 1) * 20 >= data.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Lead Detail Dialog */}
      <Dialog open={!!detailLead} onOpenChange={(o) => { if (!o) setDetailLead(null); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Lead Details</DialogTitle>
          </DialogHeader>
          {detailLead && (
            <div className="space-y-3 text-sm">
              <DetailRow label="Name" value={`${detailLead.first_name || ""} ${detailLead.last_name || ""}`.trim() || "--"} />
              <DetailRow label="Email" value={detailLead.email || "--"} />
              <DetailRow label="Phone" value={detailLead.phone || "--"} />
              <DetailRow label="Source">
                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${sourceColors[detailLead.source] || "bg-gray-100 text-gray-800"}`}>
                  {detailLead.source}
                </span>
              </DetailRow>
              <DetailRow label="Lead Type" value={detailLead.lead_type} />
              <DetailRow label="Status">
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[detailLead.status] || ""}`}>
                  {detailLead.status}
                </span>
              </DetailRow>
              <DetailRow label="Score" value={String(detailLead.score)} />
              <DetailRow label="Created" value={new Date(detailLead.created_at).toLocaleString()} />

              {/* UTM Fields */}
              <div className="border-t pt-3 mt-3">
                <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Attribution</h4>
                <DetailRow label="UTM Source" value={detailLead.utm_source || "--"} />
                <DetailRow label="UTM Medium" value={detailLead.utm_medium || "--"} />
                <DetailRow label="UTM Campaign" value={detailLead.utm_campaign || "--"} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function DetailRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      {children ?? <span className="font-medium">{value}</span>}
    </div>
  );
}
