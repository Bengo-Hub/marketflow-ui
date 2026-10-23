"use client";

import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, BarChart3, Clock, Mail, MessageSquare, Pencil, Plus, Repeat, Trash2 } from "lucide-react";
import { FeatureLock, useFeature } from "@bengo-hub/shared-ui-lib/subscription";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { WhatsAppIcon } from "@/components/public-profile/whatsapp-icon";
import { CapsuleTabs, EmptyState, ErrorState, Field, PageHeader, ToneBadge, humanize } from "@/components/ui-kit";
import { useSaveSequence, useSequenceStats, useSequences } from "@/hooks/use-sequences";
import { SEQUENCE_TRIGGERS, STEP_CHANNELS, TEMPLATE_VARS, type Sequence, type SequenceInput, type SequenceStep } from "@/lib/api/sequences";

const CHANNEL_ICON = { whatsapp: <WhatsAppIcon className="h-4 w-4" />, sms: <MessageSquare className="h-4 w-4" />, email: <Mail className="h-4 w-4" /> };
const VAR_LABEL: Record<string, string> = {
  fbo_name: "Your business name", whatsapp_link: "WhatsApp link", profile_link: "Public page link", shop_link: "Shop link",
  product_link: "Product link", join_link: "Join link",
};
const triggerLabel =(t: string) => SEQUENCE_TRIGGERS.find((x) => x.value === t)?.label ?? humanize(t);

function waitLabel(hours: number) {
  if (hours <= 0) return "Straight away";
  if (hours % 24 === 0) return `${hours / 24} day${hours === 24 ? "" : "s"} later`;
  return `${hours} hour${hours === 1 ? "" : "s"} later`;
}

function StepEditor({ step, index, total, onChange, onMove, onRemove }: {
  step: SequenceStep; index: number; total: number;
  onChange: (s: SequenceStep) => void; onMove: (d: -1 | 1) => void; onRemove: () => void;
}) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const insert = (v: string) => {
    const el = bodyRef.current;
    const text = step.body ?? "";
    const at = el?.selectionStart ?? text.length;
    onChange({ ...step, body: `${text.slice(0, at)}{{${v}}}${text.slice(at)}` });
  };
  const days = Math.floor(step.delay_hours / 24);
  const hours = step.delay_hours % 24;
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold">Message {index + 1}</p>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={index === 0} onClick={() => onMove(-1)}><ArrowUp /></Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={index === total - 1} onClick={() => onMove(1)}><ArrowDown /></Button>
          <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove message" disabled={total === 1} onClick={onRemove}><Trash2 className="text-destructive" /></Button>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <CapsuleTabs label="Send by" value={step.channel} onChange={(v) => onChange({ ...step, channel: v as SequenceStep["channel"] })} options={STEP_CHANNELS.map((c) => ({ value: c, label: c === "sms" ? "SMS" : humanize(c) }))} />
        <div className="flex items-center gap-2 text-sm">
          <span className="text-muted-foreground">{index === 0 ? "Send after" : "Wait"}</span>
          <Input aria-label="Days" type="number" min={0} max={90} className="w-16" value={days} onChange={(e) => onChange({ ...step, delay_hours: Math.max(0, Number(e.target.value) || 0) * 24 + hours })} />
          <span>days</span>
          <Input aria-label="Hours" type="number" min={0} max={23} className="w-16" value={hours} onChange={(e) => onChange({ ...step, delay_hours: days * 24 + Math.min(23, Math.max(0, Number(e.target.value) || 0)) })} />
          <span>hours</span>
        </div>
      </div>
      {step.channel === "email" && (
        <Field label="Subject" className="mt-3" htmlFor={`sq-s-${index}`}>
          <Input id={`sq-s-${index}`} value={step.subject ?? ""} onChange={(e) => onChange({ ...step, subject: e.target.value })} />
        </Field>
      )}
      <Field label="Message" className="mt-3" htmlFor={`sq-b-${index}`} hint={step.channel === "sms" ? `${(step.body ?? "").length} characters` : undefined}>
        <Textarea ref={bodyRef} id={`sq-b-${index}`} rows={4} value={step.body ?? ""} onChange={(e) => onChange({ ...step, body: e.target.value })} />
      </Field>
      <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Insert a detail">
        {TEMPLATE_VARS.map((v) => (
          <button key={v} type="button" onClick={() => insert(v)} className="min-h-8 rounded-lg border border-border bg-background/70 px-2 text-xs hover:border-primary/50">
            {VAR_LABEL[v] ?? humanize(v)}
          </button>
        ))}
      </div>
    </div>
  );
}

function SequenceForm({ initial, id, onDone }: { initial: SequenceInput; id?: string; onDone: () => void }) {
  const save = useSaveSequence();
  const [f, setF] = useState<SequenceInput>(initial);
  const setStep = (i: number, s: SequenceStep) => setF({ ...f, steps: f.steps.map((x, j) => (j === i ? s : x)) });
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    const steps = f.steps.slice();
    [steps[i], steps[j]] = [steps[j], steps[i]];
    setF({ ...f, steps });
  };
  const emptyBody = f.steps.some((s) => !(s.body ?? "").trim() && !(s.template ?? "").trim());
  return (
    <>
      <div className="max-h-[62vh] space-y-4 overflow-y-auto pr-1">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" required htmlFor="sq-name"><Input id="sq-name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
          <div>
            <p className="mb-1.5 text-sm font-medium">Who it is for</p>
            <CapsuleTabs label="Lead type" value={f.lead_type_filter || "all"} onChange={(v) => setF({ ...f, lead_type_filter: v === "all" ? undefined : v })} options={[{ value: "all", label: "Everyone" }, { value: "customer", label: "Buyers" }, { value: "recruit", label: "Recruits" }]} />
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium">Starts</p>
          <CapsuleTabs label="Trigger" value={f.trigger_event} onChange={(v) => setF({ ...f, trigger_event: v })} options={SEQUENCE_TRIGGERS.map((t) => ({ value: t.value, label: t.label }))} />
        </div>
        {f.steps.map((s, i) => (
          <StepEditor key={i} step={s} index={i} total={f.steps.length} onChange={(x) => setStep(i, x)} onMove={(d) => move(i, d)} onRemove={() => setF({ ...f, steps: f.steps.filter((_, j) => j !== i) })} />
        ))}
        <Button type="button" variant="outline" onClick={() => setF({ ...f, steps: [...f.steps, { delay_hours: 24, channel: "whatsapp", body: "" }] })}>
          <Plus /> Add a message
        </Button>
      </div>
      <DialogFooter>
        {emptyBody && <p className="mr-auto text-sm text-destructive">Every message needs text.</p>}
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button disabled={!f.name.trim() || emptyBody || save.isPending} onClick={() => save.mutate({ id, data: { ...f, name: f.name.trim() } }, { onSuccess: onDone })}>
          {save.isPending ? "Saving..." : id ? "Save sequence" : "Create sequence"}
        </Button>
      </DialogFooter>
    </>
  );
}

function Stats({ s }: { s: Sequence }) {
  const { enrollments, delivery } = useSequenceStats(s.id);
  const e = enrollments.data;
  const c = delivery.data?.counts ?? {};
  const tile = (label: string, v?: number | string) => (
    <div className="rounded-2xl border border-border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-display text-xl font-semibold tabular">{v ?? 0}</p>
    </div>
  );
  if (enrollments.isError || delivery.isError) return <ErrorState onRetry={() => { void enrollments.refetch(); void delivery.refetch(); }} />;
  if (enrollments.isLoading || delivery.isLoading) return <div className="h-40 animate-pulse rounded-xl bg-muted" />;
  return (
    <div className="space-y-4">
      <div>
        <p className="mb-2 text-sm font-medium">People</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tile("Enrolled", e?.total_enrolled)}{tile("In progress", e?.active)}{tile("Finished", e?.completed)}{tile("Dropped", e?.dropped)}
        </div>
        {e && e.total_enrolled > 0 && <p className="mt-2 text-sm text-muted-foreground">{e.completion_rate.toFixed(0)}% reached the last message.</p>}
      </div>
      <div>
        <p className="mb-2 text-sm font-medium">Messages, last 30 days</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {tile("Sent", c.sent)}{tile("Delivered", c.delivered)}{tile("Opened", c.opened)}{tile("Replied", c.replied)}
        </div>
        {(c.failed ?? 0) + (c.bounced ?? 0) > 0 && <p className="mt-2 text-sm text-destructive">{(c.failed ?? 0) + (c.bounced ?? 0)} could not be delivered.</p>}
      </div>
    </div>
  );
}

export default function SequencesPage() {
  const has = useFeature("email_sequences");
  const list = useSequences();
  const save = useSaveSequence();
  const [editing, setEditing] = useState<{ id?: string; data: SequenceInput } | null>(null);
  const [stats, setStats] = useState<Sequence | null>(null);
  const rows = list.data?.data ?? [];
  const blank: SequenceInput = { name: "", trigger_event: "lead.created", active: true, steps: [{ delay_hours: 0, channel: "whatsapp", body: "Hi {{first_name}}, thanks for getting in touch with {{fbo_name}}. " }] };
  const newBtn = <Button onClick={() => setEditing({ data: blank })}><Plus /> New sequence</Button>;

  return (
    <div className="space-y-6">
      <PageHeader icon={<Repeat />} title="Follow-up sequences" description="Messages that go out on a schedule after someone becomes a lead." actions={has ? newBtn : <FeatureLock feature="email_sequences" mode="block">{newBtn}</FeatureLock>} />

      {list.isError && <ErrorState message="Could not load sequences." onRetry={() => void list.refetch()} />}
      {list.isLoading && <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="glass h-44 animate-pulse rounded-[1.25rem]" />)}</div>}
      {!list.isLoading && !list.isError && rows.length === 0 && (
        <div className="glass rounded-[1.25rem]"><EmptyState icon={<Repeat />} title="No sequences yet" description="Welcome new leads on WhatsApp straight away, then follow up over the next days." action={has ? newBtn : undefined} /></div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((s) => (
          <article key={s.id} className="glass flex flex-col rounded-[1.25rem] p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="truncate font-display text-lg font-semibold">{s.name}</h2>
                <p className="text-sm text-muted-foreground">{triggerLabel(s.trigger_event)}</p>
              </div>
              <Switch checked={s.active} aria-label={s.active ? "Turn off" : "Turn on"} onCheckedChange={(v) => save.mutate({ id: s.id, data: { active: v } })} />
            </div>
            <ol className="mt-4 space-y-2">
              {s.steps.slice(0, 4).map((st, i) => (
                <li key={i} className="flex items-center gap-3 text-sm">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">{CHANNEL_ICON[st.channel] ?? <Mail className="h-4 w-4" />}</span>
                  <span className="min-w-0 flex-1 truncate">{st.subject || st.body || st.template || "Message"}</span>
                  <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Clock className="h-3 w-3" />{waitLabel(st.delay_hours)}</span>
                </li>
              ))}
              {s.steps.length > 4 && <li className="text-xs text-muted-foreground">and {s.steps.length - 4} more</li>}
            </ol>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-4">
              <ToneBadge tone={s.active ? "success" : "neutral"}>{s.active ? "On" : "Off"}</ToneBadge>
              <span className="text-xs text-muted-foreground tabular">{s.total_enrolled} enrolled, {s.total_completed} finished</span>
              <div className="ml-auto flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => setStats(s)}><BarChart3 /> Results</Button>
                <Button variant="ghost" size="sm" onClick={() => setEditing({ id: s.id, data: { name: s.name, trigger_event: s.trigger_event, lead_type_filter: s.lead_type_filter ?? undefined, active: s.active, steps: s.steps } })}><Pencil /> Edit</Button>
              </div>
            </div>
          </article>
        ))}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit sequence" : "New sequence"}</DialogTitle></DialogHeader>
          {editing && <SequenceForm key={editing.id ?? "new"} initial={editing.data} id={editing.id} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <Dialog open={!!stats} onOpenChange={(o) => !o && setStats(null)}>
        <DialogContent className="max-w-xl">
          <DialogHeader><DialogTitle>Results: {stats?.name}</DialogTitle></DialogHeader>
          {stats && <Stats s={stats} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
