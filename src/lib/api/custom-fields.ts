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

export const customFieldsApi = {
  listDefs: (params?: Record<string, string>) =>
    apiClient.get<{ data: CustomFieldDef[] }>("/api/v1/custom-fields/defs", { params }),
  createDef: (data: Record<string, unknown>) => apiClient.post("/api/v1/custom-fields/defs", data),
  updateDef: (id: string, data: Record<string, unknown>) => apiClient.put(`/api/v1/custom-fields/defs/${id}`, data),
  deleteDef: (id: string) => apiClient.delete(`/api/v1/custom-fields/defs/${id}`),
  defs: (entityType: EntityType) =>
    apiClient.get<{ data: CustomFieldDef[] }>("/api/v1/custom-fields/defs", { params: { entity_type: entityType } }).then((r) => r.data.data ?? []),
  values: (entityType: EntityType, entityId: string) =>
    apiClient.get<{ data: CustomFieldValue[] }>(`/api/v1/${entityType}s/${entityId}/custom-fields`).then((r) => r.data.data ?? []),
  setValues: (entityType: EntityType, entityId: string, values: Array<{ field_def_id: string; value: string }>) =>
    apiClient.put(`/api/v1/${entityType}s/${entityId}/custom-fields`, { values }),
};
