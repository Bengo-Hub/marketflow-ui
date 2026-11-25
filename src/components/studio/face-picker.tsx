"use client";

import { SearchableCombobox } from "@bengo-hub/shared-ui-lib/combobox";
import { Field } from "@/components/ui-kit";
import { useBrandFaces } from "@/hooks/use-brand-faces";

/** Picks whose look the presenter takes, from the people who agreed. Shows nothing when there are none. */
export function FacePicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const faces = (useBrandFaces().data?.faces ?? []).filter((f) => f.live);
  if (faces.length === 0) return null;
  return (
    <Field label="Looks like" hint="Only people who agreed are listed. Their consent is in Settings, Brand. Drawing a new presenter from a person costs a few extra AI credits.">
      <SearchableCombobox
        options={[{ value: "", label: "No real person" }, ...faces.map((f) => ({ value: f.id, label: f.name }))]}
        value={faces.some((f) => f.id === value) ? value : ""}
        onChange={(v: string) => onChange(v)}
        placeholder="No real person"
      />
    </Field>
  );
}
