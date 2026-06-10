"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customFieldsApi } from "@/lib/api/custom-fields";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Pencil } from "lucide-react";

const ENTITY_TYPES = ["lead", "contact", "deal"];
const FIELD_TYPES = ["text", "number", "date", "boolean", "select"];

interface FieldDef {
  id: string;
  name: string;
  label: string;
  field_type: string;
  entity_type: string;
  required: boolean;
  options?: string[];
}

interface FieldForm {
  name: string;
  label: string;
  field_type: string;
  entity_type: string;
  required: boolean;
  options: string;
}

const emptyForm: FieldForm = {
  name: "",
  label: "",
  field_type: "text",
  entity_type: "lead",
  required: false,
  options: "",
};

export default function CustomFieldsPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const qc = useQueryClient();
  const [entityFilter, setEntityFilter] = useState("lead");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<FieldDef | null>(null);
  const [form, setForm] = useState<FieldForm>(emptyForm);

  const { data, isLoading, error } = useQuery({
    queryKey: ["custom-fields", orgSlug, entityFilter],
    queryFn: () => customFieldsApi.listDefs({ entity_type: entityFilter }),
  });

  const fields: FieldDef[] = (data as { data?: { items?: FieldDef[] } })?.data?.items ?? [];

  const createMut = useMutation({
    mutationFn: (payload: Record<string, unknown>) => customFieldsApi.createDef(payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom-fields"] }); setOpen(false); },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      customFieldsApi.updateDef(id, payload),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["custom-fields"] }); setOpen(false); },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => customFieldsApi.deleteDef(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["custom-fields"] }),
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...emptyForm, entity_type: entityFilter });
    setOpen(true);
  }

  function openEdit(f: FieldDef) {
    setEditing(f);
    setForm({
      name: f.name,
      label: f.label,
      field_type: f.field_type,
      entity_type: f.entity_type,
      required: f.required,
      options: f.options?.join(", ") ?? "",
    });
    setOpen(true);
  }

  function handleSubmit() {
    const payload: Record<string, unknown> = {
      name: form.name,
      label: form.label,
      field_type: form.field_type,
      entity_type: form.entity_type,
      required: form.required,
    };
    if (form.field_type === "select" && form.options) {
      payload.options = form.options.split(",").map((s) => s.trim()).filter(Boolean);
    }
    if (editing) {
      updateMut.mutate({ id: editing.id, payload });
    } else {
      createMut.mutate(payload);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Custom Fields</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Define extra fields for leads, contacts, and deals.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2">
          <Plus className="h-4 w-4" /> Add Field
        </Button>
      </div>

      {error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Failed to load custom fields: {(error as Error).message}
        </div>
      )}

      {/* Entity type filter */}
      <div className="flex gap-2">
        {ENTITY_TYPES.map((t) => (
          <Button
            key={t}
            variant={entityFilter === t ? "default" : "outline"}
            size="sm"
            onClick={() => setEntityFilter(t)}
            className="capitalize"
          >
            {t}
          </Button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Label</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Required</TableHead>
              <TableHead>Options</TableHead>
              <TableHead className="w-24" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">Loading…</TableCell></TableRow>
            ) : fields.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-10 text-muted-foreground">No custom fields yet.</TableCell></TableRow>
            ) : fields.map((f) => (
              <TableRow key={f.id}>
                <TableCell className="font-mono text-sm">{f.name}</TableCell>
                <TableCell>{f.label}</TableCell>
                <TableCell><Badge variant="secondary" className="capitalize">{f.field_type}</Badge></TableCell>
                <TableCell>{f.required ? <Badge>Yes</Badge> : <span className="text-muted-foreground text-sm">No</span>}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{f.options?.join(", ") || "—"}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEdit(f)} aria-label="Edit field"><Pencil className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteMut.mutate(f.id)} aria-label="Delete field">
                      <Trash2 className="h-4 w-4 text-rose-500" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create / Edit dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Field" : "Create Custom Field"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Key name</label>
                <Input
                  placeholder="e.g. company_size"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Display label</label>
                <Input
                  placeholder="e.g. Company Size"
                  value={form.label}
                  onChange={(e) => setForm({ ...form, label: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium">Entity type</label>
                <Select value={form.entity_type} onValueChange={(v) => setForm({ ...form, entity_type: v ?? "lead" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ENTITY_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">Field type</label>
                <Select value={form.field_type} onValueChange={(v) => setForm({ ...form, field_type: v ?? "text" })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FIELD_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {form.field_type === "select" && (
              <div className="space-y-1">
                <label className="text-xs font-medium">Options (comma-separated)</label>
                <Input
                  placeholder="Small, Medium, Large"
                  value={form.options}
                  onChange={(e) => setForm({ ...form, options: e.target.value })}
                />
              </div>
            )}
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.required}
                onChange={(e) => setForm({ ...form, required: e.target.checked })}
                className="rounded"
              />
              Required field
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.name || !form.label || createMut.isPending || updateMut.isPending}
            >
              {editing ? "Save Changes" : "Create Field"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
