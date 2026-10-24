"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, ExternalLink, Info, Plus, Search, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CapsuleTabs, EmptyState, ErrorState, Field, GlassPanel, Pager, PageHeader, ToneBadge, type Tone } from "@/components/ui-kit";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { apiErrorMessage } from "@/lib/api/errors";
import { billingApi, type AdminCreditRow } from "@/lib/api/billing";
import { PRICING_URL } from "@/lib/urls";

const PAGE = 25;
const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });

const STATUS: Record<string, { label: string; tone: Tone }> = {
  active: { label: "Active", tone: "success" },
  capped: { label: "Paused", tone: "danger" },
  not_activated: { label: "Not active", tone: "neutral" },
  exempt: { label: "Exempt", tone: "info" },
};

const FILTERS = [
  { value: "", label: "All" },
  { value: "active", label: "Active" },
  { value: "not_activated", label: "Not active" },
  { value: "exempt", label: "Exempt" },
];

function GrantDialog({ row, onDone }: { row: AdminCreditRow; onDone: () => void }) {
  const qc = useQueryClient();
  const [units, setUnits] = useState("100");
  const [reason, setReason] = useState("");
  // One key per dialog, so a double click or a retry after a timeout cannot grant twice.
  const [key] = useState(() => crypto.randomUUID());
  const grant = useMutation({
    mutationFn: () => billingApi.grantCredits(row.tenant_id, "ai_credits", Math.round(Number(units)), reason.trim(), key),
    onSuccess: () => {
      toast.success(`Added ${Number(units).toLocaleString()} AI credits to ${row.name}`);
      void qc.invalidateQueries({ queryKey: ["platform-credits"] });
      onDone();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not add the credits")),
  });
  const n = Number(units);
  const valid = Number.isFinite(n) && n > 0 && n <= 100000 && reason.trim().length >= 3;
  return (
    <>
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {row.name} has {row.unlimited ? "unlimited" : (row.bundle_balance + row.quota_balance).toLocaleString()} AI credits. Added credits are free to the business and are recorded with your reason.
        </p>
        <Field label="Credits to add" required htmlFor="g-u"><Input id="g-u" type="number" inputMode="numeric" min={1} max={100000} value={units} onChange={(e) => setUnits(e.target.value)} /></Field>
        <Field label="Reason" required htmlFor="g-r" hint="For example: launch promotion, refund for a failed poster"><Input id="g-r" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} /></Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button disabled={!valid || grant.isPending} onClick={() => grant.mutate()}>{grant.isPending ? "Adding..." : "Add credits"}</Button>
      </DialogFooter>
    </>
  );
}

export default function PlatformBillingPage() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [granting, setGranting] = useState<AdminCreditRow | null>(null);
  const search = useDebouncedValue(q.trim(), 300);

  const list = useQuery({
    queryKey: ["platform-credits", "ai_credits", search, status, page],
    queryFn: () => billingApi.adminCredits({ service: "ai_credits", q: search, status, limit: PAGE, offset: (page - 1) * PAGE }),
    placeholderData: keepPreviousData,
  });
  const rows = list.data?.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<CreditCard />}
        title="Billing"
        description="AI credits held and used by each business."
        actions={
          <a href={`${PRICING_URL}/platform/subscriptions`} target="_blank" rel="noreferrer" className={buttonVariants({ variant: "outline" })}>
            Plans and subscriptions <ExternalLink />
          </a>
        }
      />

      <GlassPanel>
        <div className="flex gap-3 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            MarketFlow bills AI credits only: a monthly plan or prepaid bundles, priced in subscriptions-api. Ad budgets are paid on each business&apos;s own ad account, with no fee from us. Plans, trials and exemptions are managed in the pricing console.
          </p>
        </div>
      </GlassPanel>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input aria-label="Search businesses" placeholder="Search by name or slug" className="pl-9" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <CapsuleTabs label="Status" value={status} onChange={(v) => { setStatus(v); setPage(1); }} options={FILTERS} />
      </div>

      <div className="glass overflow-hidden rounded-[1.25rem]">
        {list.isError && <div className="p-4"><ErrorState message={apiErrorMessage(list.error, "Could not load credit balances.")} onRetry={() => void list.refetch()} /></div>}
        {list.isLoading && <div className="space-y-2 p-4">{[0, 1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>}
        {!list.isLoading && !list.isError && rows.length === 0 && (
          <EmptyState icon={<Zap />} title={search || status ? "No businesses match" : "No businesses yet"} description="Businesses appear here once they exist in subscriptions-api." />
        )}
        {rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Plan</th>
                  <th className="px-4 py-3 text-right">Credits left</th>
                  <th className="px-4 py-3 text-right">Used this month</th>
                  <th className="px-4 py-3">Last used</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const st = STATUS[r.status] ?? { label: r.status, tone: "neutral" as Tone };
                  return (
                    <tr key={r.tenant_id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                      <td className="px-4 py-3">
                        <p className="font-medium">{r.name}</p>
                        <p className="text-xs text-muted-foreground">{r.slug}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.plan_name || "None"}</td>
                      <td className="px-4 py-3 text-right font-medium tabular">{r.unlimited ? "Unlimited" : (r.bundle_balance + r.quota_balance).toLocaleString()}</td>
                      <td className="px-4 py-3 text-right tabular">{r.units_used_month.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground tabular">{r.last_activity_at ? dateFmt.format(new Date(r.last_activity_at)) : "Never"}</td>
                      <td className="px-4 py-3"><ToneBadge tone={st.tone}>{st.label}</ToneBadge></td>
                      <td className="px-4 py-3 text-right">
                        {!r.exempt && <Button variant="ghost" size="sm" onClick={() => setGranting(r)}><Plus /> Add credits</Button>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {list.data && (
          <div className="px-4 pb-4">
            <Pager page={page} limit={list.data.limit || PAGE} total={list.data.total} onPage={setPage} />
          </div>
        )}
      </div>

      <Dialog open={!!granting} onOpenChange={(o) => !o && setGranting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add AI credits</DialogTitle></DialogHeader>
          {granting && <GrantDialog key={granting.tenant_id} row={granting} onDone={() => setGranting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
