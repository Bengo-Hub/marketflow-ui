"use client";

import { useState } from "react";
import { Pencil, Plus, SlidersHorizontal, Trash2 } from "lucide-react";
import type { DataTableColumn } from "@bengo-hub/shared-ui-lib/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { CapsuleTabs, ConfirmDialog, EmptyState, Field, ListEditor, ListTable, PageHeader, ToneBadge } from "@/components/ui-kit";
import { useDeleteFieldDef, useFieldDefs, useSaveFieldDef } from "@/hooks/use-custom-fields";
import type { EntityType } from "@/lib/api/activities";
import type { CustomFieldDef, FieldType } from "@/lib/api/custom-fields";

const ENTITIES: { value: EntityType; label: string }[] = [
  { value: "lead", label: "Leads" },
  { value: "contact", label: "Contacts" },
  { value: "deal", label: "Deals" },
];

const TYPES: { value: FieldType; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "date", label: "Date" },
  { value: "boolean", label: "Yes or no" },
  { value: "select", label: "One choice" },
  { value: "multiselect", label: "Several choices" },
];
const typeLabel = (t: string) => TYPES.find((x) => x.value === t)?.label ?? t;
const isChoice = (t: string) => t === "select" || t === "multiselect";

/** "Company size" becomes company_size; the server accepts 2 to 40 of a-z, 0-9 and _. */
function toKey(label: string) {
  const k = label.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 40);
  return /^[a-z]/.test(k) ? k : k ? `f_${k}`.slice(0, 40) : "";
}

function FieldForm({ entity, def, onDone }: { entity: EntityType; def?: CustomFieldDef; onDone: () => void }) {
  const save = useSaveFieldDef();
  const [label, setLabel] = useState(def?.field_label ?? "");
  const [key, setKey] = useState(def?.field_key ?? "");
  const [keyTouched, setKeyTouched] = useState(!!def);
  const [type, setType] = useState<FieldType>(def?.field_type ?? "text");
  const [options, setOptions] = useState<string[]>(def?.options ?? []);
  const [required, setRequired] = useState(def?.is_required ?? false);
  const effectiveKey = keyTouched ? key : toKey(label);
  const keyOk = /^[a-z][a-z0-9_]{1,39}$/.test(effectiveKey);
  const valid = label.trim() && (def || keyOk) && (!isChoice(type) || options.length > 0);

  const submit = () =>
    save.mutate(
      def
        ? { id: def.id, update: { field_label: label.trim(), is_required: required, ...(isChoice(def.field_type) ? { options } : {}) } }
        : { create: { entity_type: entity, field_key: effectiveKey, field_label: label.trim(), field_type: type, is_required: required, ...(isChoice(type) ? { options } : {}) } },
      { onSuccess: onDone },
    );

  return (
    <>
      <div className="space-y-4">
        <Field label="Name people see" required htmlFor="cf-label"><Input id="cf-label" maxLength={80} value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Company size" /></Field>
        {!def && (
          <Field label="Key" htmlFor="cf-key" hint="Used in imports and the API. It can't change later." error={effectiveKey && !keyOk ? "Start with a letter; use a to z, digits and _ (2 to 40)." : undefined}>
            <Input id="cf-key" className="font-mono" maxLength={40} value={effectiveKey} onChange={(e) => { setKeyTouched(true); setKey(e.target.value.toLowerCase()); }} />
          </Field>
        )}
        <Field label="Kind of answer" hint={def ? "The kind can't change once the field exists." : undefined}>
          {def ? (
            <ToneBadge>{typeLabel(def.field_type)}</ToneBadge>
          ) : (
            <div className="flex flex-wrap gap-2">
              {TYPES.map((t) => (
                <button key={t.value} type="button" onClick={() => setType(t.value)} className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${type === t.value ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-accent"}`}>
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </Field>
        {isChoice(def?.field_type ?? type) && (
          <Field label="Choices" required>
            <ListEditor label="choices" value={options} onChange={setOptions} maxItems={50} maxLength={60} placeholder="Small" />
          </Field>
        )}
        <label className="flex items-center gap-3 text-sm">
          <Switch checked={required} onCheckedChange={(v: boolean) => setRequired(v)} />
          Must be filled in
        </label>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>Cancel</Button>
        <Button disabled={!valid || save.isPending} onClick={submit}>{save.isPending ? "Saving..." : def ? "Save field" : "Add field"}</Button>
      </DialogFooter>
    </>
  );
}

export default function CustomFieldsPage() {
  const [entity, setEntity] = useState<EntityType>("lead");
  const defs = useFieldDefs(entity);
  const del = useDeleteFieldDef();
  const [editing, setEditing] = useState<{ def?: CustomFieldDef } | null>(null);
  const [deleting, setDeleting] = useState<CustomFieldDef | null>(null);
  const entityLabel = ENTITIES.find((e) => e.value === entity)!.label.toLowerCase();

  const columns: DataTableColumn<CustomFieldDef>[] = [
    {
      key: "field_label",
      header: "Field",
      primary: true,
      sortable: true,
      accessor: (d) => d.field_label,
      render: (d) => (
        <span>
          <span className="font-medium">{d.field_label}</span>
          <span className="block font-mono text-xs text-muted-foreground">{d.field_key}</span>
        </span>
      ),
    },
    { key: "field_type", header: "Kind", sortable: true, filterable: true, accessor: (d) => typeLabel(d.field_type), render: (d) => <ToneBadge>{typeLabel(d.field_type)}</ToneBadge> },
    { key: "is_required", header: "Required", accessor: (d) => (d.is_required ? "Yes" : "No"), render: (d) => (d.is_required ? <ToneBadge tone="primary">Required</ToneBadge> : <span className="text-muted-foreground">Optional</span>) },
    { key: "options", header: "Choices", hideBelow: "lg", accessor: (d) => (d.options ?? []).join(", "), render: (d) => <span className="block max-w-xs truncate text-sm text-muted-foreground">{(d.options ?? []).join(", ")}</span> },
    {
      key: "actions",
      header: <span className="sr-only">Actions</span>,
      mobileAction: true,
      exportable: false,
      render: (d) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="icon-sm" aria-label={`Edit ${d.field_label}`} onClick={() => setEditing({ def: d })}><Pencil /></Button>
          <Button variant="ghost" size="icon-sm" aria-label={`Delete ${d.field_label}`} onClick={() => setDeleting(d)}><Trash2 className="text-destructive" /></Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<SlidersHorizontal />}
        title="Custom fields"
        description="Extra details you keep on leads, contacts and deals. They show on each record's page."
        actions={<Button onClick={() => setEditing({})}><Plus /> Add field</Button>}
      />
      <CapsuleTabs label="Record type" value={entity} onChange={setEntity} options={ENTITIES} />
      <ListTable<CustomFieldDef>
        columns={columns}
        rows={defs.data ?? []}
        rowKey={(d) => d.id}
        loading={defs.isLoading}
        error={defs.isError}
        onRetry={() => void defs.refetch()}
        storageKey="mf-custom-fields-columns"
        emptyState={
          <EmptyState
            icon={<SlidersHorizontal />}
            title={`No fields on ${entityLabel} yet`}
            description="For example: company size, preferred contact time, or how they heard about you."
            action={<Button onClick={() => setEditing({})}><Plus /> Add a field</Button>}
          />
        }
      />

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader><DialogTitle>{editing?.def ? "Edit field" : `New field on ${entityLabel}`}</DialogTitle></DialogHeader>
          {editing && <FieldForm key={editing.def?.id ?? `new-${entity}`} entity={entity} def={editing.def} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title={`Delete "${deleting?.field_label}"?`}
        description={`Every value saved in this field on ${entityLabel} is deleted with it. This cannot be undone.`}
        confirmLabel="Delete field"
        pending={del.isPending}
        onConfirm={() => deleting && del.mutate(deleting.id, { onSuccess: () => setDeleting(null) })}
      />
    </div>
  );
}
