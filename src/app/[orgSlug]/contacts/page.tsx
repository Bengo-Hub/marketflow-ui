"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Combine, FileUp, Search, UserCheck } from "lucide-react";
import type { DataTableColumn } from "@bengo-hub/shared-ui-lib/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ImportContactsDialog } from "@/components/contacts/import-dialog";
import { CapsuleTabs, ConfirmDialog, EmptyState, ListTable, PageHeader, ToneBadge, humanize } from "@/components/ui-kit";
import { useContacts, useMergeContacts } from "@/hooks/use-contacts";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { CONTACT_TYPES, contactName, type Contact } from "@/lib/api/contacts";

const dateFmt = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" });

export default function ContactsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const router = useRouter();
  const [type, setType] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [selected, setSelected] = useState<Record<string, Contact>>({});
  const [survivor, setSurvivor] = useState<string | null>(null);
  const q = useDebouncedValue(search.trim(), 300);
  const list = useContacts({ q, contact_type: type }, page);
  const merge = useMergeContacts();

  const rows = list.data?.data ?? [];
  // The selection keeps whole contacts, so a merge can span pages.
  const picked = Object.values(selected);
  const selectedKeys = new Set(Object.keys(selected));
  const onSelectedChange = (keys: Set<string>) =>
    setSelected((prev) => {
      const next: Record<string, Contact> = {};
      for (const k of keys) {
        const c = prev[k] ?? rows.find((r) => r.id === k);
        if (c) next[k] = c;
      }
      return next;
    });

  const columns: DataTableColumn<Contact>[] = [
    {
      key: "name",
      header: "Contact",
      primary: true,
      accessor: (c) => contactName(c),
      render: (c) => (
        <Link href={`/${orgSlug}/contacts/${c.id}`} className="font-medium hover:text-primary" onClick={(e) => e.stopPropagation()}>
          {contactName(c)}
          <span className="block text-xs font-normal text-muted-foreground">{[c.email, c.phone].filter(Boolean).join("  ") || "No contact details"}</span>
        </Link>
      ),
    },
    { key: "contact_type", header: "Type", accessor: (c) => c.contact_type, render: (c) => <ToneBadge>{humanize(c.contact_type)}</ToneBadge> },
    { key: "total_orders", header: "Orders", align: "right", accessor: (c) => c.total_orders ?? 0, render: (c) => <span className="tabular">{c.total_orders ?? 0}</span> },
    { key: "created_at", header: "Added", accessor: (c) => c.created_at, render: (c) => <span className="text-muted-foreground tabular">{dateFmt.format(new Date(c.created_at))}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UserCheck />}
        title="Contacts"
        description="Customers and prospects across MarketFlow, POS and Books."
        actions={
          <>
            <Button onClick={() => setImporting(true)}>
              <FileUp />
              Import CSV
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <CapsuleTabs
          label="Filter by type"
          value={type}
          onChange={(v) => {
            setType(v);
            setPage(1);
          }}
          options={[{ value: "all", label: "All" }, ...CONTACT_TYPES.map((t) => ({ value: t, label: humanize(t) }))]}
        />
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search contacts"
            className="pl-9"
            placeholder="Search name, email or phone"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>

      <ListTable<Contact>
        columns={columns}
        rows={rows}
        rowKey={(c) => c.id}
        loading={list.isLoading}
        error={list.isError}
        onRetry={() => void list.refetch()}
        storageKey="mf-contacts-columns"
        onRowClick={(c) => router.push(`/${orgSlug}/contacts/${c.id}`)}
        selectable
        selected={selectedKeys}
        onSelectedChange={onSelectedChange}
        bulkActions={[
          {
            key: "merge",
            label: picked.length >= 2 ? `Merge ${picked.length} into one` : "Pick 2 or more to merge",
            icon: <Combine className="size-4" />,
            disabled: picked.length < 2,
            onClick: () => setSurvivor(picked[0].id),
          },
        ]}
        paging={{ page, limit: list.data?.limit || 20, total: list.data?.total ?? 0, onPage: setPage }}
        emptyState={
          <EmptyState
            icon={<UserCheck />}
            title={q || type !== "all" ? "No contacts match" : "No contacts yet"}
            description="Contacts are created from converted leads, POS and online sales, or a CSV import."
            action={<Button variant="outline" onClick={() => setImporting(true)}>Import a CSV</Button>}
          />
        }
      />

      <ImportContactsDialog open={importing} onOpenChange={setImporting} />

      <ConfirmDialog
        open={!!survivor}
        onOpenChange={(o) => !o && setSurvivor(null)}
        variant="default"
        title={`Merge ${picked.length} contacts into one`}
        description={
          <span className="block space-y-3">
            <span className="block">
              Pick the contact to keep. The others are folded into it: missing details, order totals, deals, chats, meetings and
              follow-ups move over, POS and Books repoint their records, and the duplicates are removed.
            </span>
            <span className="block space-y-1.5">
              {picked.map((c) => (
                <label key={c.id} className="flex cursor-pointer items-center gap-2 rounded-xl border border-border p-2.5 text-sm text-foreground">
                  <input type="radio" name="survivor" checked={survivor === c.id} onChange={() => setSurvivor(c.id)} className="accent-[hsl(var(--primary))]" />
                  <span className="font-medium">{contactName(c)}</span>
                  <span className="text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join("  ")}</span>
                </label>
              ))}
            </span>
          </span>
        }
        confirmLabel="Merge contacts"
        pending={merge.isPending}
        onConfirm={() =>
          survivor &&
          merge.mutate(
            { survivorId: survivor, duplicateIds: picked.map((c) => c.id).filter((id) => id !== survivor) },
            {
              onSuccess: () => {
                setSurvivor(null);
                setSelected({});
              },
            },
          )
        }
      />
    </div>
  );
}
