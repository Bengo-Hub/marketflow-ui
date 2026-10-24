"use client";

import { useState } from "react";
import { Filter, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import { SearchableCombobox } from "@bengo-hub/shared-ui-lib/combobox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CapsuleTabs, ConfirmDialog, EmptyState, ErrorState, Field, PageHeader, ToneBadge, humanize } from "@/components/ui-kit";
import { useSaveSegment, useSegmentAction, useSegments } from "@/hooks/use-accounts-segments";
import { OP_LABEL, SEGMENT_FIELDS, type Segment, type SegmentCondition, type SegmentField, type SegmentRules } from "@/lib/api/segments";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

function describe(c: SegmentCondition) {
  const f = SEGMENT_FIELDS[c.field];
  if (!f) return `${c.field} ${c.op} ${String(c.value)}`;
  if (f.kind === "bool") return `${f.label}: ${c.value ? "yes" : "no"}`;
  if (f.kind === "days") return `${f.label} ${OP_LABEL[c.op]} ${c.value}`;
  return `${f.label} ${OP_LABEL[c.op] ?? c.op} ${f.kind === "choice" ? humanize(String(c.value)) : c.value}`;
}

function defaultFor(field: SegmentField): SegmentCondition {
  const f = SEGMENT_FIELDS[field];
  const value = f.kind === "bool" ? true : f.kind === "choice" ? f.choices[0] : f.kind === "days" ? 30 : 1;
  return { field, op: f.ops[0], value };
}

function ConditionRow({ c, onChange, onRemove }: { c: SegmentCondition; onChange: (c: SegmentCondition) => void; onRemove: () => void }) {
  const f = SEGMENT_FIELDS[c.field];
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-background/60 p-2">
      <div className="w-48">
        <SearchableCombobox
          options={(Object.keys(SEGMENT_FIELDS) as SegmentField[]).map((k) => ({ value: k, label: SEGMENT_FIELDS[k].label }))}
          value={c.field}
          onChange={(v: string) => v && onChange(defaultFor(v as SegmentField))}
          placeholder="Field"
        />
      </div>
      {f.kind !== "bool" && f.ops.length > 1 && (
        <CapsuleTabs label="Comparison" value={c.op} onChange={(op) => onChange({ ...c, op })} options={f.ops.map((o) => ({ value: o, label: OP_LABEL[o] }))} />
      )}
      {f.kind === "choice" && (
        <div className="w-40">
          <SearchableCombobox options={f.choices.map((v) => ({ value: v, label: humanize(v) }))} value={String(c.value)} onChange={(v: string) => v && onChange({ ...c, value: v })} placeholder="Value" />
        </div>
      )}
      {(f.kind === "number" || f.kind === "days") && (
        <Input aria-label="Value" type="number" min={0} className="w-24" value={Number(c.value)} onChange={(e) => onChange({ ...c, value: Math.max(0, Number(e.target.value) || 0) })} />
      )}
      {f.kind === "bool" && (
        <CapsuleTabs label="Yes or no" value={c.value ? "yes" : "no"} onChange={(v) => onChange({ ...c, value: v === "yes" })} options={[{ value: "yes", label: "Yes" }, { value: "no", label: "No" }]} />
      )}
      <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove condition" className="ml-auto" onClick={onRemove}><X /></Button>
    </div>
  );
}

function SegmentForm({ seg, onDone }: { seg?: Segment; onDone: () => void }) {
  const save = useSaveSegment();
  const [name, setName] = useState(seg?.name ?? "");
  const [rules, setRules] = useState<SegmentRules>(seg?.filter_rules?.conditions ? (seg.filter_rules as SegmentRules) : { match: "all", conditions: [defaultFor("lifecycle_stage")] });
  const setCond = (i: number, c: SegmentCondition) => setRules({ ...rules, conditions: rules.conditions.map((x, j) => (j === i ? c : x)) });
  return (
    <>
      <div className="space-y-4">
        <Field label="Name" required htmlFor="sg-n"><Input id="sg-n" value={name} onChange={(e) => setName(e.target.value)} /></Field>
        <div className="flex items-center gap-2 text-sm">
          <span>Contacts who match</span>
          <CapsuleTabs label="Match" value={rules.match} onChange={(m) => setRules({ ...rules, match: m })} options={[{ value: "all", label: "all" }, { value: "any", label: "any" }]} />
          <span>of these:</span>
        </div>
        <div className="space-y-2">
          {rules.conditions.map((c, i) => (
            <ConditionRow key={i} c={c} onChange={(x) => setCond(i, x)} onRemove={() => setRules({ ...rules, conditions: rules.conditions.filter((_, j) => j !== i) })} />
          ))}
          <Button type="button" variant="outline" size="sm" onClick={() => setRules({ ...rules, conditions: [...rules.conditions, defaultFor("total_orders")] })}><Plus /> Add a condition</Button>
        </div>
        {rules.conditions.length === 0 && <p className="text-sm text-muted-foreground">With no conditions the segment holds every contact.</p>}
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button disabled={!name.trim() || save.isPending} onClick={() => save.mutate({ id: seg?.id, name: name.trim(), rules }, { onSuccess: onDone })}>
          {save.isPending ? "Saving..." : seg ? "Save segment" : "Create segment"}
        </Button>
      </DialogFooter>
    </>
  );
}

export default function SegmentsPage() {
  const list = useSegments();
  const act = useSegmentAction();
  const [editing, setEditing] = useState<{ seg?: Segment } | null>(null);
  const [deleting, setDeleting] = useState<Segment | null>(null);
  const rows = list.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader icon={<Filter />} title="Segments" description="Groups of contacts you can message together, kept up to date by rules." actions={<Button onClick={() => setEditing({})}><Plus /> New segment</Button>} />
      {list.isError && <ErrorState message="Could not load segments." onRetry={() => void list.refetch()} />}
      {list.isLoading && <div className="grid gap-4 md:grid-cols-2">{[0, 1].map((i) => <div key={i} className="glass h-40 animate-pulse rounded-[1.25rem]" />)}</div>}
      {!list.isLoading && !list.isError && rows.length === 0 && (
        <div className="glass rounded-[1.25rem]"><EmptyState icon={<Filter />} title="No segments yet" description="For example: customers who ordered in the last 90 days and accept SMS." /></div>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        {rows.map((s) => {
          const conds = s.filter_rules?.conditions ?? [];
          return (
            <article key={s.id} className="glass flex flex-col rounded-[1.25rem] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="truncate font-display text-lg font-semibold">{s.name}</h2>
                  <p className="text-xs text-muted-foreground">{s.last_calculated_at ? `Counted ${when.format(new Date(s.last_calculated_at))}` : "Not counted yet"}</p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl font-semibold tabular">{(s.member_count ?? 0).toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">{s.entity_type === "lead" ? "leads" : "contacts"}</p>
                </div>
              </div>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {conds.length === 0 ? <ToneBadge>Everyone</ToneBadge> : conds.map((c, i) => <ToneBadge key={i} tone="info">{describe(c)}</ToneBadge>)}
                {conds.length > 1 && <span className="text-xs text-muted-foreground">({s.filter_rules?.match === "any" ? "any of these" : "all of these"})</span>}
              </ul>
              {s.entity_type === "lead" && <p className="mt-2 text-xs text-warning">Lead segments count every lead; rules apply to contact segments only.</p>}
              <div className="mt-auto flex justify-end gap-1 pt-4">
                <Button variant="ghost" size="sm" disabled={act.isPending} onClick={() => act.mutate({ id: s.id, action: "count" })}><RefreshCw /> Recount</Button>
                {s.entity_type !== "lead" && <Button variant="ghost" size="sm" onClick={() => setEditing({ seg: s })}><Pencil /> Edit</Button>}
                <Button variant="ghost" size="icon-sm" aria-label={`Delete ${s.name}`} onClick={() => setDeleting(s)}><Trash2 className="text-destructive" /></Button>
              </div>
            </article>
          );
        })}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.seg ? "Edit segment" : "New segment"}</DialogTitle></DialogHeader>
          {editing && <SegmentForm key={editing.seg?.id ?? "new"} seg={editing.seg} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.name}"?`}
        description="Campaign sends already created keep their recipients. This cannot be undone."
        confirmLabel="Delete segment"
        pending={act.isPending}
        onConfirm={() => deleting && act.mutate({ id: deleting.id, action: "delete" }, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
