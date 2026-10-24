"use client";

import { SearchableCombobox } from "@bengo-hub/shared-ui-lib/combobox";
import type { EntityType } from "@/lib/api/activities";
import { contactName, contactsApi } from "@/lib/api/contacts";
import { leadName, leadsApi } from "@/lib/api/leads";

export type RecordRef = { type: EntityType; id: string; label: string };

/**
 * Picks the lead or contact a task, deal or note belongs to, searching both lists on the server as
 * the user types (no full list is loaded). The value is "type:id".
 */
export function RecordPicker({
  value,
  onChange,
  placeholder = "Search a lead or contact",
}: {
  value: RecordRef | null;
  onChange: (r: RecordRef | null) => void;
  placeholder?: string;
}) {
  const search = async (q: string) => {
    const [leads, contacts] = await Promise.all([
      leadsApi.list({ q }, 1, 8).catch(() => ({ data: [] })),
      contactsApi.list({ q }, 1, 8).catch(() => ({ data: [] })),
    ]);
    return [
      ...contacts.data.map((c) => ({ value: `contact:${c.id}`, label: `${contactName(c)} (contact)` })),
      ...leads.data.map((l) => ({ value: `lead:${l.id}`, label: `${leadName(l)} (lead)` })),
    ];
  };
  return (
    <SearchableCombobox
      options={value ? [{ value: `${value.type}:${value.id}`, label: value.label }] : []}
      value={value ? `${value.type}:${value.id}` : ""}
      valueLabel={value?.label}
      onChange={(v: string, opt?: { label: string }) => {
        if (!v) return onChange(null);
        const [type, id] = v.split(":");
        onChange({ type: type as EntityType, id, label: opt?.label ?? v });
      }}
      onRemoteSearch={search}
      remoteThreshold={2}
      placeholder={placeholder}
      searchPlaceholder="Type a name, phone or email"
      emptyText="No match. Try another name."
      clearable
    />
  );
}
