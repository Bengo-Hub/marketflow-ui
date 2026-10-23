"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Mail, Pencil, Phone, Trash2, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { WhatsAppIcon } from "@/components/public-profile/whatsapp-icon";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { CustomFieldsPanel } from "@/components/crm/custom-fields-panel";
import { CapsuleTabs, ConfirmDialog, ErrorState, Field, GlassPanel, StatCard, StatusBadge, ToneBadge, humanize } from "@/components/ui-kit";
import { useContact360, useDeleteContact, useUpdateContact } from "@/hooks/use-contacts";
import { CONTACT_TYPES, contactName, type Contact, type ContactUpdate } from "@/lib/api/contacts";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });
const money = (v?: number, c = "KES") => (v == null ? "" : `${c} ${new Intl.NumberFormat("en-KE").format(v)}`);

/** Summaries from POS, Books and loyalty are free-form; show their scalar values as label and value. */
function SummaryList({ data }: { data?: Record<string, unknown> }) {
  const entries = Object.entries(data ?? {}).filter(([, v]) => ["string", "number", "boolean"].includes(typeof v));
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">Nothing recorded yet.</p>;
  return (
    <dl className="divide-y divide-border text-sm">
      {entries.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-2">
          <dt className="text-muted-foreground">{humanize(k)}</dt>
          <dd className="font-medium tabular">{typeof v === "number" ? v.toLocaleString() : String(v)}</dd>
        </div>
      ))}
    </dl>
  );
}

function EditContact({ c, open, onOpenChange }: { c: Contact; open: boolean; onOpenChange: (o: boolean) => void }) {
  const update = useUpdateContact(c.id);
  const [f, setF] = useState<ContactUpdate>({
    first_name: c.first_name ?? "",
    last_name: c.last_name ?? "",
    email: c.email ?? "",
    phone: c.phone ?? "",
    contact_type: c.contact_type,
    subscribed_email: c.subscribed_email ?? false,
    subscribed_sms: c.subscribed_sms ?? false,
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Edit contact</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" htmlFor="ce-fn"><Input id="ce-fn" value={f.first_name} onChange={(e) => setF({ ...f, first_name: e.target.value })} /></Field>
          <Field label="Last name" htmlFor="ce-ln"><Input id="ce-ln" value={f.last_name} onChange={(e) => setF({ ...f, last_name: e.target.value })} /></Field>
          <Field label="Email" htmlFor="ce-em"><Input id="ce-em" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Phone" htmlFor="ce-ph"><Input id="ce-ph" type="tel" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></Field>
          <div className="sm:col-span-2">
            <p className="mb-1.5 text-sm font-medium">Type</p>
            <CapsuleTabs label="Contact type" value={f.contact_type ?? "customer"} onChange={(v) => setF({ ...f, contact_type: v })} options={CONTACT_TYPES.map((t) => ({ value: t, label: humanize(t) }))} />
          </div>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
            Marketing emails
            <Switch checked={!!f.subscribed_email} onCheckedChange={(v) => setF({ ...f, subscribed_email: v })} />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm">
            Marketing SMS
            <Switch checked={!!f.subscribed_sms} onCheckedChange={(v) => setF({ ...f, subscribed_sms: v })} />
          </label>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button disabled={update.isPending} onClick={() => update.mutate(f, { onSuccess: () => onOpenChange(false) })}>
            {update.isPending ? "Saving..." : "Save contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function ContactDetailPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>();
  const router = useRouter();
  const v = useContact360(id);
  const del = useDeleteContact();
  const [editing, setEditing] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const d = v.data;
  const c = d?.contact;
  const wa = c?.phone ? `https://wa.me/${c.phone.replace(/\D/g, "")}` : null;

  return (
    <div className="space-y-6">
      <Link href={`/${orgSlug}/contacts`} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        All contacts
      </Link>

      {v.isError && <ErrorState message="Could not load this contact." onRetry={() => void v.refetch()} />}
      {v.isLoading && <div className="glass h-40 animate-pulse rounded-[1.25rem]" />}

      {d && c && (
        <>
          <div className="glass flex flex-col gap-4 rounded-[1.25rem] p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserRound className="h-6 w-6" />
              </div>
              <div>
                <h1 className="font-display text-2xl font-semibold tracking-tight">{contactName(c)}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <ToneBadge>{humanize(c.contact_type)}</ToneBadge>
                  {c.lifecycle_stage && <ToneBadge tone="info">{humanize(c.lifecycle_stage)}</ToneBadge>}
                  {[c.email, c.phone].filter(Boolean).join("  ")}
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {wa && (
                <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-dark">
                  <WhatsAppIcon className="h-4 w-4" /> WhatsApp
                </a>
              )}
              {c.phone && <a href={`tel:${c.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-sm font-medium hover:bg-muted"><Phone className="h-4 w-4" /> Call</a>}
              {c.email && <a href={`mailto:${c.email}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-sm font-medium hover:bg-muted"><Mail className="h-4 w-4" /> Email</a>}
              <Button variant="outline" onClick={() => setEditing(true)}><Pencil /> Edit</Button>
              <Button variant="ghost" size="icon" aria-label="Delete contact" onClick={() => setConfirm(true)}><Trash2 className="text-destructive" /></Button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Orders" value={(c.total_orders ?? 0).toLocaleString()} hint={c.last_order_at ? `Last ${when.format(new Date(c.last_order_at))}` : undefined} />
            <StatCard label="Open deals" value={d.open_deals.length} hint={money(d.open_deals.reduce((s, x) => s + (x.value ?? 0), 0))} />
            <StatCard label="Won deals" value={d.won_deals.length} hint={money(d.won_deals.reduce((s, x) => s + (x.value ?? 0), 0))} />
            <StatCard label="In follow-up sequences" value={d.nurture_active.length} />
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div className="space-y-6">
              <GlassPanel title="Purchases" description="From POS and online orders">
                <SummaryList data={d.order_summary} />
              </GlassPanel>
              <GlassPanel title="Payments and balance" description="From Books">
                <SummaryList data={d.payment_summary} />
              </GlassPanel>
              {d.loyalty_summary && Object.keys(d.loyalty_summary).length > 0 && (
                <GlassPanel title="Loyalty"><SummaryList data={d.loyalty_summary} /></GlassPanel>
              )}
              {(d.open_tasks.length > 0 || d.meetings.length > 0) && (
                <GlassPanel title="Coming up">
                  <ul className="space-y-2 text-sm">
                    {d.meetings.map((m) => (
                      <li key={m.id} className="flex items-center justify-between gap-3">
                        <span>{humanize(m.meeting_type)}</span>
                        <span className="flex items-center gap-2 text-muted-foreground tabular">{when.format(new Date(m.scheduled_at))} <StatusBadge status={m.status} /></span>
                      </li>
                    ))}
                    {d.open_tasks.map((t) => (
                      <li key={t.id} className="flex items-center justify-between gap-3">
                        <Link href={`/${orgSlug}/crm/tasks`} className="hover:text-primary">{t.title}</Link>
                        <span className="text-muted-foreground tabular">{t.due_at ? when.format(new Date(t.due_at)) : "No due date"}</span>
                      </li>
                    ))}
                  </ul>
                </GlassPanel>
              )}
              <CustomFieldsPanel entity="contact" id={id} />
            </div>
            <ActivityTimeline entity="contact" id={id} />
          </div>

          <EditContact key={c.updated_at ?? c.id} c={c} open={editing} onOpenChange={setEditing} />
        </>
      )}

      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete this contact?"
        description="The contact is removed for good. Sales and invoices in POS and Books that point to it lose the link. If this is a duplicate, merge it from the contacts list instead."
        confirmLabel="Delete contact"
        pending={del.isPending}
        onConfirm={() => del.mutate(id, { onSuccess: () => router.push(`/${orgSlug}/contacts`) })}
      />
    </div>
  );
}
