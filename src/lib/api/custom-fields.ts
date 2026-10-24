import { apiClient } from "./client";
import type { EntityType } from "./activities";

export type FieldType = "text" | "number" | "date" | "select" | "multiselect" | "boolean";

export interface CustomFieldDef {
  id: string;
  entity_type: EntityType;
  field_key: string;
  field_label: string;
  field_type: FieldType;
  options?: string[];
  is_required: boolean;
  sort_order: number;
}

export interface CustomFieldValue {
  id: string;
  entity_type: EntityType;
  entity_id: string;
  field_def_id: string;
  /** Always a string: numbers as digits, booleans as "true"/"false", multiselect comma-separated. */
  value: string;
}

/** POST /custom-fields/defs. The key, type and record type are fixed once created. */
export interface CustomFieldDefInput {
  entity_type: EntityType;
  field_key: string;
  field_label: string;
  field_type: FieldType;
  options?: string[];
  is_required?: boolean;
  sort_order?: number;
}

/** PUT /custom-fields/defs/{id}: only these change after creation (options for choice fields). */
export interface CustomFieldDefUpdate {
  field_label?: string;
  options?: string[];
  is_required?: boolean;
  sort_order?: number;
}

export const customFieldsApi = {
  createDef: (data: CustomFieldDefInput) => apiClient.post<CustomFieldDef>("/api/v1/custom-fields/defs", data).then((r) => r.data),
  updateDef: (id: string, data: CustomFieldDefUpdate) => apiClient.put<CustomFieldDef>(`/api/v1/custom-fields/defs/${id}`, data).then((r) => r.data),
  /** Also removes every value saved for the field; answers how many. */
  deleteDef: (id: string) => apiClient.delete<{ values_removed: number }>(`/api/v1/custom-fields/defs/${id}`).then((r) => r.data),
  defs: (entityType: EntityType) =>
    apiClient.get<{ data: CustomFieldDef[] }>("/api/v1/custom-fields/defs", { params: { entity_type: entityType } }).then((r) => r.data.data ?? []),
  values: (entityType: EntityType, entityId: string) =>
    apiClient.get<{ data: CustomFieldValue[] }>(`/api/v1/${entityType}s/${entityId}/custom-fields`).then((r) => r.data.data ?? []),
  setValues: (entityType: EntityType, entityId: string, values: Array<{ field_def_id: string; value: string }>) =>
    apiClient.put(`/api/v1/${entityType}s/${entityId}/custom-fields`, { values }),
};
