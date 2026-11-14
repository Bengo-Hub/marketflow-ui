"use client";

import { useState } from "react";
import { ChevronDown, Download } from "lucide-react";
import { toast } from "sonner";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { analyticsApi, type DashboardDays, type ReportFormat } from "@/lib/api/analytics";
import { apiErrorMessage } from "@/lib/api/errors";
import { datedFilename, saveBlob } from "@/lib/download";

const FORMATS: { value: ReportFormat; label: string }[] = [
  { value: "pdf", label: "PDF report" },
  { value: "xlsx", label: "Excel workbook" },
  { value: "csv", label: "CSV file" },
];

/** Sprint 7 #51: the dashboard and campaign return as a branded file for the chosen period. */
export function ReportDownload({ days }: { days: DashboardDays }) {
  const [busy, setBusy] = useState(false);
  const download = async (format: ReportFormat) => {
    setBusy(true);
    try {
      saveBlob(await analyticsApi.report(days, format), datedFilename(`marketing-report-${days}d`, format));
    } catch (e) {
      toast.error(apiErrorMessage(e, "Could not download the report"));
    } finally {
      setBusy(false);
    }
  };
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={busy}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background/60 px-3 text-sm font-medium hover:bg-accent disabled:opacity-60"
      >
        <Download className="h-4 w-4" />
        {busy ? "Preparing..." : "Download report"}
        <ChevronDown className="h-4 w-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {FORMATS.map((f) => (
          <DropdownMenuItem key={f.value} onClick={() => void download(f.value)}>
            {f.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
