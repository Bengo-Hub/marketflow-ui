"use client";

import { useState } from "react";
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CreditCard, ExternalLink, Info, Plus, Search, Zap } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import type { DataTableColumn } from "@bengo-hub/shared-ui-lib/data-table";
import { CapsuleTabs, EmptyState, ErrorState, Field, GlassPanel, ListTable, PageHeader, ToneBadge, type Tone } from "@/components/ui-kit";
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

  const columns: DataTableColumn<AdminCreditRow>[] = [
    {
      key: "name",
      header: "Business",
      primary: true,
      accessor: (r) => r.name,
      render: (r) => (
        <span>
          <span className="font-medium">{r.name}</span>
          <span className="block text-xs text-muted-foreground">{r.slug}</span>
        </span>
      ),
    },
    { key: "plan_name", header: "Plan", hideBelow: "md", accessor: (r) => r.plan_name || "None", render: (r) => <span className="text-muted-foreground">{r.plan_name || "None"}</span> },
    { key: "balance", header: "Credits left", align: "right", accessor: (r) => (r.unlimited ? "Unlimited" : r.bundle_balance + r.quota_balance), render: (r) => <span className="font-medium tabular">{r.unlimited ? "Unlimited" : (r.bundle_balance + r.quota_balance).toLocaleString()}</span> },
    { key: "units_used_month", header: "Used this month", align: "right", accessor: (r) => r.units_used_month, render: (r) => <span className="tabular">{r.units_used_month.toLocaleString()}</span> },
    { key: "last_activity_at", header: "Last used", hideBelow: "lg", accessor: (r) => r.last_activity_at ?? "", render: (r) => <span className="text-muted-foreground tabular">{r.last_activity_at ? dateFmt.format(new Date(r.last_activity_at)) : "Never"}</span> },
    {
      key: "status",
      header: "Status",
      accessor: (r) => STATUS[r.status]?.label ?? r.status,
      render: (r) => {
        const st = STATUS[r.status] ?? { label: r.status, tone: "neutral" as Tone };
        return <ToneBadge tone={st.tone}>{st.label}</ToneBadge>;
      },
    },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      mobileAction: true,
      exportable: false,
      render: (r) => (!r.exempt ? <Button variant="ghost" size="sm" onClick={() => setGranting(r)}><Plus /> Add credits</Button> : null),
    },
  ];

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

      {list.isError && <ErrorState message={apiErrorMessage(list.error, "Could not load credit balances.")} onRetry={() => void list.refetch()} />}
      <ListTable<AdminCreditRow>
        columns={columns}
        rows={rows}
        rowKey={(r) => r.tenant_id}
        loading={list.isLoading}
        storageKey="mf-platform-credits-columns"
        showExportCsv
        exportFileName="ai-credits-by-business"
        paging={{ page, limit: list.data?.limit || PAGE, total: list.data?.total ?? 0, onPage: setPage }}
        emptyState={<EmptyState icon={<Zap />} title={search || status ? "No businesses match" : "No businesses yet"} description="Businesses appear here once they exist in subscriptions-api." />}
      />

      <Dialog open={!!granting} onOpenChange={(o) => !o && setGranting(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Add AI credits</DialogTitle></DialogHeader>
          {granting && <GrantDialog key={granting.tenant_id} row={granting} onDone={() => setGranting(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
