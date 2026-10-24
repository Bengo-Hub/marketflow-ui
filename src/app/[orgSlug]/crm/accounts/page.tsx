"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Building2, ExternalLink, Pencil, Plus, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { DataTableColumn } from "@bengo-hub/shared-ui-lib/data-table";
import { ConfirmDialog, EmptyState, ErrorState, Field, ListTable, PageHeader, ToneBadge } from "@/components/ui-kit";
import { useAccountContacts, useAccounts, useRemoveAccount, useSaveAccount } from "@/hooks/use-accounts-segments";
import type { Account, AccountInput } from "@/lib/api/accounts";
import { contactName } from "@/lib/api/contacts";

const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });

function hostOf(url?: string | null) {
  if (!url) return "";
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).host;
  } catch {
    return url;
  }
}

function AccountForm({ account, onDone }: { account?: Account; onDone: () => void }) {
  const save = useSaveAccount();
  const [form, setForm] = useState({
    name: account?.name ?? "",
    industry: account?.industry ?? "",
    website: account?.website ?? "",
    phone: account?.phone ?? "",
    employee_count: account?.employee_count ? String(account.employee_count) : "",
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const submit = () => {
    const data: AccountInput = { name: form.name.trim() };
    if (form.industry.trim()) data.industry = form.industry.trim();
    if (form.website.trim()) data.website = form.website.trim();
    if (form.phone.trim()) data.phone = form.phone.trim();
    if (Number(form.employee_count) > 0) data.employee_count = Math.round(Number(form.employee_count));
    save.mutate({ id: account?.id, data }, { onSuccess: onDone });
  };
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company name" required htmlFor="ac-n" className="sm:col-span-2"><Input id="ac-n" value={form.name} onChange={set("name")} autoComplete="organization" /></Field>
        <Field label="Industry" htmlFor="ac-i"><Input id="ac-i" value={form.industry} onChange={set("industry")} placeholder="Retail, health, schools..." /></Field>
        <Field label="Employees" htmlFor="ac-e"><Input id="ac-e" type="number" inputMode="numeric" min={0} value={form.employee_count} onChange={set("employee_count")} /></Field>
        <Field label="Website" htmlFor="ac-w"><Input id="ac-w" type="url" inputMode="url" value={form.website} onChange={set("website")} placeholder="https://" /></Field>
        <Field label="Phone" htmlFor="ac-p"><Input id="ac-p" type="tel" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="+2547..." /></Field>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button disabled={!form.name.trim() || save.isPending} onClick={submit}>
          {save.isPending ? "Saving..." : account ? "Save account" : "Add account"}
        </Button>
      </DialogFooter>
    </>
  );
}

function AccountContacts({ account, orgSlug }: { account: Account; orgSlug: string }) {
  const contacts = useAccountContacts(account.id);
  const list = contacts.data ?? [];
  if (contacts.isLoading) return <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-muted" />)}</div>;
  if (contacts.isError) return <ErrorState message="Could not load this account's contacts." onRetry={() => void contacts.refetch()} />;
  if (list.length === 0) return <EmptyState icon={<Users />} title="No contacts linked" description="Contacts join an account when their record names it, for example after an import." />;
  return (
    <ul className="divide-y divide-border">
      {list.map((c) => (
        <li key={c.id}>
          <Link href={`/${orgSlug}/contacts/${c.id}`} className="block py-3 active:opacity-70 hover:text-primary">
            <p className="truncate font-medium">{contactName(c)}</p>
            <p className="truncate text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join("  ") || "No contact details"}</p>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function AccountsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [page, setPage] = useState(1);
  const list = useAccounts(page);
  const remove = useRemoveAccount();
  const [editing, setEditing] = useState<{ account?: Account } | null>(null);
  const [deleting, setDeleting] = useState<Account | null>(null);
  const [viewing, setViewing] = useState<Account | null>(null);
  const rows = list.data?.data ?? [];

  const columns: DataTableColumn<Account>[] = [
    {
      key: "name",
      header: "Account",
      primary: true,
      sortable: true,
      accessor: (a) => a.name,
      render: (a) => (
        <button type="button" className="text-left font-medium hover:text-primary" onClick={() => setViewing(a)}>
          {a.name}
          {a.phone && <span className="block text-xs font-normal text-muted-foreground">{a.phone}</span>}
        </button>
      ),
    },
    {
      key: "industry",
      header: "Industry",
      sortable: true,
      filterable: true,
      accessor: (a) => a.industry ?? "",
      render: (a) => (a.industry ? <ToneBadge>{a.industry}</ToneBadge> : <span className="text-muted-foreground">Not set</span>),
    },
    {
      key: "website",
      header: "Website",
      hideBelow: "lg",
      accessor: (a) => a.website ?? "",
      render: (a) =>
        a.website ? (
          <a href={a.website.startsWith("http") ? a.website : `https://${a.website}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
            {hostOf(a.website)} <ExternalLink className="size-3" />
          </a>
        ) : (
          <span className="text-muted-foreground">Not set</span>
        ),
    },
    { key: "employee_count", header: "Employees", align: "right", sortable: true, accessor: (a) => a.employee_count ?? 0, render: (a) => <span className="tabular">{a.employee_count ? a.employee_count.toLocaleString() : ""}</span> },
    { key: "created_at", header: "Added", sortable: true, accessor: (a) => a.created_at, render: (a) => <span className="text-muted-foreground tabular">{dateFmt.format(new Date(a.created_at))}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      mobileAction: true,
      exportable: false,
      render: (a) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${a.name}`} onClick={() => setEditing({ account: a })}><Pencil /></Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${a.name}`} onClick={() => setDeleting(a)}><Trash2 className="text-destructive" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Building2 />}
        title="Accounts"
        description="Companies and organisations your contacts belong to."
        actions={<Button onClick={() => setEditing({})}><Plus /> New account</Button>}
      />

      <ListTable<Account>
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        storageKey="mf-accounts-columns"
        showExportCsv
        exportFileName="accounts"
        paging={{ page, limit: list.data?.limit || 25, total: list.data?.total ?? 0, onPage: setPage }}
        emptyState={
          <EmptyState
            icon={<Building2 />}
            title="No accounts yet"
            description="Add the businesses you sell to, then see every contact who works there in one place."
            action={<Button onClick={() => setEditing({})}><Plus /> Add an account</Button>}
          />
        }
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.account ? "Edit account" : "New account"}</DialogTitle></DialogHeader>
          {editing && <AccountForm key={editing.account?.id ?? "new"} account={editing.account} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>

      <Sheet open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader><SheetTitle>{viewing?.name}</SheetTitle></SheetHeader>
          {viewing && (
            <div className="space-y-4 px-4 pb-6">
              <p className="text-sm text-muted-foreground">{[viewing.industry, viewing.phone, hostOf(viewing.website)].filter(Boolean).join("  ") || "No details yet"}</p>
              <h3 className="font-display text-sm font-semibold">Contacts</h3>
              <AccountContacts account={viewing} orgSlug={orgSlug} />
            </div>
          )}
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="Its contacts and deals stay; they are just no longer linked to an account. This cannot be undone."
        confirmLabel="Delete account"
        pending={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
