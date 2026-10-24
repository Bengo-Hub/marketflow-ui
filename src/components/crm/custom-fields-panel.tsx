"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SearchableCombobox } from "@bengo-hub/shared-ui-lib/combobox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Field, GlassPanel } from "@/components/ui-kit";
import { useFieldDefs } from "@/hooks/use-custom-fields";
import type { EntityType } from "@/lib/api/activities";
import { customFieldsApi, type CustomFieldDef } from "@/lib/api/custom-fields";
import { apiErrorMessage } from "@/lib/api/errors";

/**
 * Fills in the tenant's custom fields for one lead, contact or deal. The values endpoints had no UI
 * before 2026-10-23, so fields defined in Settings could never be filled.
 */
export function CustomFieldsPanel({ entity, id }: { entity: EntityType; id: string }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const defs = useFieldDefs(entity);
  const values = useQuery({ queryKey: ["cf-values", entity, id], queryFn: () => customFieldsApi.values(entity, id), enabled: !!id });
  const [edits, setEdits] = useState<Record<string, string>>({});

  const saved = Object.fromEntries((values.data ?? []).map((v) => [v.field_def_id, v.value]));
  const current = (d: CustomFieldDef) => edits[d.id] ?? saved[d.id] ?? "";
  const dirty = Object.keys(edits).filter((k) => edits[k] !== (saved[k] ?? ""));
  const sorted = [...(defs.data ?? [])].sort((a, b) => a.sort_order - b.sort_order);
  const missing = sorted.filter((d) => d.is_required && !current(d).trim());

  const save = useMutation({
    mutationFn: () => customFieldsApi.setValues(entity, id, dirty.map((k) => ({ field_def_id: k, value: edits[k] }))),
    onSuccess: () => {
      toast.success("Fields saved");
      setEdits({});
      void qc.invalidateQueries({ queryKey: ["cf-values", entity, id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the fields")),
  });

  if (defs.isLoading || values.isLoading) return <div className="glass h-32 animate-pulse rounded-[1.25rem]" />;
  if (sorted.length === 0) {
    return (
      <GlassPanel title="Custom fields">
        <p className="text-sm text-muted-foreground">
          No custom fields for {entity}s yet.{" "}
          <Link href={`/${orgSlug}/settings/custom-fields`} className="font-semibold text-primary hover:underline">
            Add one in Settings
          </Link>
        </p>
      </GlassPanel>
    );
  }

  const set = (id: string, v: string) => setEdits((e) => ({ ...e, [id]: v }));

  return (
    <GlassPanel
      title="Custom fields"
      actions={
        <Button size="sm" disabled={dirty.length === 0 || missing.length > 0 || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? "Saving..." : "Save fields"}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        {sorted.map((d) => {
          const v = current(d);
          const err = d.is_required && !v.trim() && dirty.length > 0 ? "Required" : null;
          return (
            <Field key={d.id} label={d.field_label} required={d.is_required} error={err} htmlFor={`cf-${d.id}`}>
              {d.field_type === "boolean" ? (
                <div className="flex h-10 items-center">
                  <Switch id={`cf-${d.id}`} checked={v === "true"} onCheckedChange={(c) => set(d.id, c ? "true" : "false")} />
                </div>
              ) : d.field_type === "select" ? (
                <SearchableCombobox
                  options={(d.options ?? []).map((o) => ({ value: o, label: o }))}
                  value={v}
                  onChange={(x: string) => set(d.id, x)}
                  placeholder="Choose"
                  clearable={!d.is_required}
                />
              ) : d.field_type === "multiselect" ? (
                <div className="flex flex-wrap gap-2">
                  {(d.options ?? []).map((o) => {
                    const list = v ? v.split(",").map((s) => s.trim()).filter(Boolean) : [];
                    const on = list.includes(o);
                    return (
                      <button
                        key={o}
                        type="button"
                        aria-pressed={on}
                        onClick={() => set(d.id, (on ? list.filter((x) => x !== o) : [...list, o]).join(","))}
                        className={
                          on
                            ? "min-h-9 rounded-xl bg-primary px-3 text-sm font-medium text-primary-foreground"
                            : "min-h-9 rounded-xl border border-border bg-background/70 px-3 text-sm hover:border-primary/50"
                        }
                      >
                        {o}
                      </button>
                    );
                  })}
                </div>
              ) : (
                <Input
                  id={`cf-${d.id}`}
                  type={d.field_type === "number" ? "number" : d.field_type === "date" ? "date" : "text"}
                  inputMode={d.field_type === "number" ? "decimal" : undefined}
                  value={v}
                  onChange={(e) => set(d.id, e.target.value)}
                />
              )}
            </Field>
          );
        })}
      </div>
    </GlassPanel>
  );
}
