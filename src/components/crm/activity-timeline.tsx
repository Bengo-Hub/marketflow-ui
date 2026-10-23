"use client";

import { useState } from "react";
import {
  CalendarDays, CircleDollarSign, FileText, Lightbulb, Mail, MessageSquare, Phone, Plus, ShoppingCart, Ticket,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppIcon } from "@/components/public-profile/whatsapp-icon";
import { CapsuleTabs, EmptyState, ErrorState, Field, GlassPanel, ToneBadge, humanize } from "@/components/ui-kit";
import { useLogActivity, useTimeline } from "@/hooks/use-activities";
import { LOGGABLE_ACTIVITY_TYPES, type Activity, type EntityType } from "@/lib/api/activities";

const ICONS: Record<string, React.ReactNode> = {
  note: <FileText className="h-4 w-4" />,
  call: <Phone className="h-4 w-4" />,
  email: <Mail className="h-4 w-4" />,
  meeting: <CalendarDays className="h-4 w-4" />,
  appointment: <CalendarDays className="h-4 w-4" />,
  sms: <MessageSquare className="h-4 w-4" />,
  whatsapp: <WhatsAppIcon className="h-4 w-4" />,
  order: <ShoppingCart className="h-4 w-4" />,
  pos_sale: <ShoppingCart className="h-4 w-4" />,
  payment: <CircleDollarSign className="h-4 w-4" />,
  ticket_opened: <Ticket className="h-4 w-4" />,
  ticket_resolved: <Ticket className="h-4 w-4" />,
  suggestion: <Lightbulb className="h-4 w-4" />,
};

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

function Item({ a }: { a: Activity }) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      <span className="relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {ICONS[a.activity_type] ?? <FileText className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">{a.subject || humanize(a.activity_type)}</p>
          {a.direction && <ToneBadge>{humanize(a.direction)}</ToneBadge>}
          {a.outcome && <ToneBadge tone="info">{humanize(a.outcome)}</ToneBadge>}
          {a.source && a.source !== "manual" && <ToneBadge tone="primary">{a.source === "agent" ? "Assistant" : humanize(a.source)}</ToneBadge>}
        </div>
        {a.body && <p className="mt-1 whitespace-pre-line text-sm text-muted-foreground">{a.body}</p>}
        <p className="mt-1 text-xs text-muted-foreground tabular">{when.format(new Date(a.performed_at || a.created_at))}</p>
      </div>
    </li>
  );
}

/** The activity history of a lead, contact or deal, with a dialog to log a call, note or message. */
export function ActivityTimeline({ entity, id, title = "Activity" }: { entity: EntityType; id: string; title?: string }) {
  const q = useTimeline(entity, id);
  const log = useLogActivity();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ activity_type: "note" as string, direction: "outbound" as "inbound" | "outbound", subject: "", body: "" });
  const rows = q.data?.data ?? [];
  const directional = ["call", "email", "sms", "whatsapp"].includes(form.activity_type);

  const submit = () =>
    log.mutate(
      {
        entity_type: entity,
        entity_id: id,
        activity_type: form.activity_type,
        direction: directional ? form.direction : undefined,
        subject: form.subject.trim() || undefined,
        body: form.body.trim() || undefined,
      },
      {
        onSuccess: () => {
          setOpen(false);
          setForm({ activity_type: "note", direction: "outbound", subject: "", body: "" });
        },
      },
    );

  return (
    <GlassPanel
      title={title}
      description={q.data ? `${q.data.total} recorded` : undefined}
      actions={
        <Button size="sm" onClick={() => setOpen(true)}>
          <Plus />
          Log activity
        </Button>
      }
    >
      {q.isError && <ErrorState onRetry={() => void q.refetch()} />}
      {q.isLoading && (
        <div className="space-y-3" aria-busy>
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      )}
      {!q.isLoading && !q.isError && rows.length === 0 && (
        <EmptyState icon={<FileText />} title="Nothing logged yet" description="Calls, messages, notes, orders and payments show up here as they happen." />
      )}
      {rows.length > 0 && (
        <ol className="relative before:absolute before:bottom-2 before:left-[1.1rem] before:top-2 before:w-px before:bg-border">
          {rows.map((a) => (
            <Item key={a.id} a={a} />
          ))}
        </ol>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Log activity</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <CapsuleTabs
              label="Activity type"
              value={form.activity_type}
              onChange={(v) => setForm({ ...form, activity_type: v })}
              options={LOGGABLE_ACTIVITY_TYPES.map((t) => ({ value: t, label: t === "sms" ? "SMS" : humanize(t) }))}
            />
            {directional && (
              <CapsuleTabs
                label="Direction"
                value={form.direction}
                onChange={(v) => setForm({ ...form, direction: v })}
                options={[
                  { value: "outbound", label: "We reached out" },
                  { value: "inbound", label: "They reached out" },
                ]}
              />
            )}
            <Field label="Subject" htmlFor="act-subject">
              <Input id="act-subject" value={form.subject} maxLength={200} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
            </Field>
            <Field label="Notes" htmlFor="act-body">
              <Textarea id="act-body" rows={4} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} disabled={log.isPending || (!form.subject.trim() && !form.body.trim())}>
              {log.isPending ? "Saving..." : "Save activity"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </GlassPanel>
  );
}
