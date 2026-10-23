"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToneBadge } from "@/components/ui-kit";
import { apiErrorMessage } from "@/lib/api/errors";
import { CONTACT_TYPES, IMPORT_CHUNK, contactsApi, type ImportResult, type ImportRow } from "@/lib/api/contacts";
import { parseCsv } from "@/lib/csv";

const COLUMNS = ["first_name", "last_name", "email", "phone", "contact_type"] as const;
// Common header spellings mapped to the API's field names.
const ALIASES: Record<string, (typeof COLUMNS)[number]> = {
  first_name: "first_name", firstname: "first_name", name: "first_name", first: "first_name",
  last_name: "last_name", lastname: "last_name", surname: "last_name", last: "last_name",
  email: "email", email_address: "email", e_mail: "email",
  phone: "phone", phone_number: "phone", mobile: "phone", whatsapp: "phone", telephone: "phone",
  contact_type: "contact_type", type: "contact_type",
};

type Summary = Pick<ImportResult, "created" | "existing" | "failed"> & { errors: Array<{ row: string; error: string }> };

/** Imports contacts from a CSV file. Rows are upserted by phone then email, so a re-run is safe. */
export function ImportContactsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const qc = useQueryClient();
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [parseError, setParseError] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);

  const reset = () => {
    setRows([]);
    setFileName("");
    setParseError(null);
    setProgress(null);
    setSummary(null);
  };

  async function onFile(file: File | undefined) {
    reset();
    if (!file) return;
    setFileName(file.name);
    if (file.size > 10 * 1024 * 1024) return setParseError("The file is larger than 10 MB. Split it into smaller files.");
    const { headers, rows: raw } = parseCsv(await file.text());
    const mapped = headers.map((h) => ALIASES[h]).filter(Boolean);
    if (!mapped.includes("email") && !mapped.includes("phone")) {
      return setParseError("The file needs an email or a phone column.");
    }
    const out: ImportRow[] = [];
    raw.forEach((r, i) => {
      const row: ImportRow = { external_ref: `row-${i + 2}` };
      for (const [h, v] of Object.entries(r)) {
        const key = ALIASES[h];
        if (key && v) row[key] = v;
      }
      if (row.contact_type && !CONTACT_TYPES.includes(row.contact_type as (typeof CONTACT_TYPES)[number])) row.contact_type = "customer";
      if (row.email || row.phone) out.push(row);
    });
    if (out.length === 0) return setParseError("No rows with an email or phone were found.");
    setRows(out);
  }

  async function run() {
    const total = rows.length;
    const acc: Summary = { created: 0, existing: 0, failed: 0, errors: [] };
    setProgress({ done: 0, total });
    try {
      for (let i = 0; i < total; i += IMPORT_CHUNK) {
        const res = await contactsApi.importChunk(rows.slice(i, i + IMPORT_CHUNK));
        acc.created += res.created;
        acc.existing += res.existing;
        acc.failed += res.failed;
        for (const r of res.results) if (r.status === "failed") acc.errors.push({ row: r.external_ref, error: r.error || "failed" });
        setProgress({ done: Math.min(total, i + IMPORT_CHUNK), total });
      }
    } catch (e) {
      acc.errors.push({ row: "batch", error: apiErrorMessage(e, "The upload stopped. Rows before this point were saved; run the same file again to finish.") });
    }
    setSummary(acc);
    setProgress(null);
    void qc.invalidateQueries({ queryKey: ["contacts"] });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (progress) return;
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import contacts</DialogTitle>
          <DialogDescription>
            A CSV with a header row. Columns we read: first name, last name, email, phone, contact type. Existing contacts with the
            same phone or email are kept, not duplicated.
          </DialogDescription>
        </DialogHeader>

        {!summary && (
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-border bg-background/50 px-4 py-8 text-center hover:border-primary/50">
            <FileUp className="h-7 w-7 text-primary" />
            <span className="text-sm font-medium">{fileName || "Choose a CSV file"}</span>
            <span className="text-xs text-muted-foreground">Up to 10 MB</span>
            <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => void onFile(e.target.files?.[0])} />
          </label>
        )}
        {parseError && <p role="alert" className="text-sm text-destructive">{parseError}</p>}

        {rows.length > 0 && !summary && (
          <div className="space-y-2">
            <p className="text-sm">
              <strong>{rows.length.toLocaleString()}</strong> contacts ready. The first five:
            </p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/60 text-left">
                  <tr>{COLUMNS.map((c) => <th key={c} className="px-3 py-2 font-semibold">{c.replace("_", " ")}</th>)}</tr>
                </thead>
                <tbody>
                  {rows.slice(0, 5).map((r) => (
                    <tr key={r.external_ref} className="border-t border-border">
                      {COLUMNS.map((c) => <td key={c} className="px-3 py-2">{r[c] ?? ""}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {progress && (
          <p className="flex items-center gap-2 text-sm" role="status">
            <Loader2 className="h-4 w-4 animate-spin" /> Importing {progress.done.toLocaleString()} of {progress.total.toLocaleString()}...
          </p>
        )}

        {summary && (
          <div className="space-y-3" role="status">
            <div className="flex flex-wrap gap-2">
              <ToneBadge tone="success">{summary.created} added</ToneBadge>
              <ToneBadge tone="info">{summary.existing} already there</ToneBadge>
              {summary.failed > 0 && <ToneBadge tone="danger">{summary.failed} failed</ToneBadge>}
            </div>
            {summary.errors.length > 0 && (
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-border p-3 text-xs">
                {summary.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    <span className="font-medium">{e.row.replace("row-", "Row ")}:</span> {e.error}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <DialogFooter>
          {summary ? (
            <Button onClick={() => { reset(); onOpenChange(false); }}>Done</Button>
          ) : (
            <>
              <Button variant="outline" disabled={!!progress} onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button disabled={rows.length === 0 || !!progress} onClick={() => void run()}>
                Import {rows.length > 0 ? rows.length.toLocaleString() : ""} contacts
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
