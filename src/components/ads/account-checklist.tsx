"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, RefreshCw, Wrench } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { ErrorState, Field, GlassPanel, ToneBadge } from "@/components/ui-kit";
import { adsSetupApi, sortItems, summary, type SetupAccount, type SetupItem, type SetupStatus } from "@/lib/api/ads-setup";
import { apiErrorMessage } from "@/lib/api/errors";

const PLATFORM: Record<string, string> = { google: "Google Ads", meta: "Meta", tiktok: "TikTok" };

const BADGE: Record<SetupStatus, { tone: "success" | "danger" | "warning" | "info" | "neutral"; label: string }> = {
  ok: { tone: "success", label: "Done" },
  action: { tone: "danger", label: "Fix this" },
  warning: { tone: "warning", label: "Improve" },
  info: { tone: "info", label: "Good to know" },
  unknown: { tone: "neutral", label: "Check yourself" },
};

/** One connected ad account's checklist. */
export function AccountChecklist({ account }: { account: SetupAccount }) {
  const qc = useQueryClient();
  const key = ["ads-setup", account.connected_account_id];
  const [open, setOpen] = useState<SetupItem | null>(null);
  const q = useQuery({ queryKey: key, queryFn: () => adsSetupApi.checklist(account.connected_account_id), staleTime: 60_000, retry: false });
  const refresh = useMutation({
    mutationFn: () => adsSetupApi.checklist(account.connected_account_id, true),
    onSuccess: (d) => qc.setQueryData(key, d),
    onError: (e) => toast.error(apiErrorMessage(e, "The account could not be read. Try again shortly.")),
  });
  const items = q.data ? sortItems(q.data.items) : [];

  return (
    <GlassPanel
      title={`${PLATFORM[account.platform] ?? account.platform}: ${account.name}`}
      description={q.data ? summary(q.data.items) : undefined}
      actions={
        <Button variant="outline" size="sm" onClick={() => refresh.mutate()} disabled={refresh.isPending || q.isLoading}>
          <RefreshCw className={refresh.isPending ? "animate-spin" : undefined} /> {refresh.isPending ? "Checking…" : "Check again"}
        </Button>
      }
    >
      {q.isLoading && <p className="text-sm text-muted-foreground" role="status">Reading the account…</p>}
      {q.isError && (
        <ErrorState message={apiErrorMessage(q.error, "The account could not be read. Try again shortly.")} onRetry={() => void q.refetch()} />
      )}
      {q.data && (
        <ul className="divide-y divide-border">
          {items.map((it) => (
            <li key={it.key} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-start">
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm font-medium">{it.title}</h3>
                  <ToneBadge tone={BADGE[it.status]?.tone}>{BADGE[it.status]?.label ?? it.status}</ToneBadge>
                </div>
                <p className="break-words text-sm text-muted-foreground">{it.detail}</p>
                {it.points && it.points.length > 0 && (
                  <ul className="list-disc space-y-0.5 break-words pl-5 text-sm text-muted-foreground">
                    {it.points.map((p, i) => <li key={i}>{p}</li>)}
                  </ul>
                )}
              </div>
              <div className="flex shrink-0 flex-wrap gap-2">
                {it.link?.url.startsWith("/") && (
                  <Link href={it.link.url} className="inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-medium hover:bg-muted">
                    {it.link.label}
                  </Link>
                )}
                {it.link && !it.link.url.startsWith("/") && (
                  <a
                    href={it.link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium hover:bg-muted"
                  >
                    {it.link.label} <ExternalLink className="size-3.5" aria-hidden />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                )}
                {it.fix && q.data.can_fix && (
                  <Button size="sm" onClick={() => setOpen(it)}>
                    <Wrench /> {it.fix.label}
                  </Button>
                )}
                {it.fix && !q.data.can_fix && <p className="text-xs text-muted-foreground">The account owner or an admin can fix this.</p>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {open?.fix && <FixDialog key={open.key} accountID={account.connected_account_id} item={open} onClose={() => setOpen(null)} />}
    </GlassPanel>
  );
}

/** Shows what a fix changes, lets the owner edit its texts, and runs it only on confirm. */
function FixDialog({ accountID, item, onClose }: { accountID: string; item: SetupItem; onClose: () => void }) {
  const qc = useQueryClient();
  const fix = item.fix!;
  const fields = fix.fields ?? [];
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(fields.map((f) => [f.key, f.value])));
  const [error, setError] = useState("");
  const run = useMutation({
    mutationFn: () => adsSetupApi.fix(accountID, item.key, fix.token, values),
    onSuccess: (d) => {
      qc.setQueryData(["ads-setup", accountID], d);
      void qc.invalidateQueries({ queryKey: ["google-ads-accounts"] });
      const after = d.items.find((i) => i.key === item.key);
      if (after?.status === "ok") toast.success("Done");
      else toast.info("The change is saved. The platform may take a few minutes to show it.");
      onClose();
    },
    onError: (e) => {
      setError(apiErrorMessage(e, "The fix did not finish. Check again to see whether anything changed."));
      // The proposal may be out of date: the next open shows the account as it is now.
      void qc.invalidateQueries({ queryKey: ["ads-setup", accountID] });
    },
  });
  const missing = fields.some((f) => f.required && !values[f.key]?.trim());

  return (
    <Dialog open onOpenChange={(o) => !o && !run.isPending && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item.title}</DialogTitle>
          <DialogDescription>Nothing happens until you confirm. This is what will change:</DialogDescription>
        </DialogHeader>
        <ul className="list-disc space-y-1 pl-5 text-sm">
          {fix.changes.map((c) => <li key={c}>{c}</li>)}
        </ul>
        {fields.length > 0 && (
          <div className="space-y-3">
            {fields.map((f) => (
              <Field key={f.key} label={f.label} htmlFor={`fix-${f.key}`} required={f.required}>
                <Input
                  id={`fix-${f.key}`}
                  value={values[f.key] ?? ""}
                  maxLength={f.max || undefined}
                  disabled={run.isPending}
                  onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                />
              </Field>
            ))}
          </div>
        )}
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={run.isPending}>Cancel</Button>
          <Button onClick={() => { setError(""); run.mutate(); }} disabled={run.isPending || missing}>
            {run.isPending ? "Working…" : fix.label}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
