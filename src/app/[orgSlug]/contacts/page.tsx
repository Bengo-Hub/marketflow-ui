"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Combine, FileUp, Search, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ImportContactsDialog } from "@/components/contacts/import-dialog";
import { CapsuleTabs, ConfirmDialog, EmptyState, ErrorState, Pager, PageHeader, ToneBadge, humanize } from "@/components/ui-kit";
import { useContacts, useMergeContacts } from "@/hooks/use-contacts";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { CONTACT_TYPES, contactName, type Contact } from "@/lib/api/contacts";

const dateFmt = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" });

export default function ContactsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
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
  const picked = Object.values(selected);
  const toggle = (c: Contact) =>
    setSelected((s) => {
      const next = { ...s };
      if (next[c.id]) delete next[c.id];
      else next[c.id] = c;
      return next;
    });

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UserCheck />}
        title="Contacts"
        description="Customers and prospects across MarketFlow, POS and Books."
        actions={
          <>
            {picked.length >= 2 && (
              <Button variant="outline" onClick={() => setSurvivor(picked[0].id)}>
                <Combine />
                Merge {picked.length}
              </Button>
            )}
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

      <div className="glass overflow-hidden rounded-[1.25rem]">
        {list.isError && <ErrorState message="Could not load contacts." onRetry={() => void list.refetch()} />}
        {list.isLoading && (
          <div className="space-y-2 p-4" aria-busy>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}
        {!list.isLoading && !list.isError && rows.length === 0 && (
          <EmptyState
            icon={<UserCheck />}
            title={q || type !== "all" ? "No contacts match" : "No contacts yet"}
            description="Contacts are created from converted leads, POS and online sales, or a CSV import."
            action={<Button variant="outline" onClick={() => setImporting(true)}>Import a CSV</Button>}
          />
        )}
        {rows.length > 0 && (
          <ul className="divide-y divide-border md:hidden">
            {rows.map((c) => (
              <li key={c.id} className="flex items-start gap-3 p-4">
                <Checkbox className="mt-1" aria-label={`Select ${contactName(c)}`} checked={!!selected[c.id]} onCheckedChange={() => toggle(c)} />
                <Link href={`/${orgSlug}/contacts/${c.id}`} className="min-w-0 flex-1 active:opacity-70">
                  <p className="truncate font-medium">{contactName(c)}</p>
                  <p className="truncate text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join("  ") || "No contact details"}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <ToneBadge>{humanize(c.contact_type)}</ToneBadge>
                    <span className="text-xs text-muted-foreground tabular">{c.total_orders ?? 0} orders</span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {rows.length > 0 && (
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-semibold text-muted-foreground">
                  <th className="w-12 px-4 py-3"><span className="sr-only">Select</span></th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Orders</th>
                  <th className="px-4 py-3">Added</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 last:border-0 hover:bg-accent/40">
                    <td className="px-4 py-3">
                      <Checkbox aria-label={`Select ${contactName(c)}`} checked={!!selected[c.id]} onCheckedChange={() => toggle(c)} />
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/${orgSlug}/contacts/${c.id}`} className="font-medium hover:text-primary">{contactName(c)}</Link>
                      <p className="text-xs text-muted-foreground">{[c.email, c.phone].filter(Boolean).join("  ") || "No contact details"}</p>
                    </td>
                    <td className="px-4 py-3"><ToneBadge>{humanize(c.contact_type)}</ToneBadge></td>
                    <td className="px-4 py-3 text-right tabular">{c.total_orders ?? 0}</td>
                    <td className="px-4 py-3 text-muted-foreground tabular">{dateFmt.format(new Date(c.created_at))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.data && (
          <div className="px-4 pb-4">
            <Pager page={page} limit={list.data.limit || 20} total={list.data.total} onPage={setPage} />
          </div>
        )}
      </div>

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
