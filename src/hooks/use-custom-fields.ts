"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type { EntityType } from "@/lib/api/activities";
import { apiErrorMessage } from "@/lib/api/errors";
import { customFieldsApi, type CustomFieldDefInput, type CustomFieldDefUpdate } from "@/lib/api/custom-fields";

/** Same key the record panels (components/crm/custom-fields-panel) read, so edits show there at once. */
export function useFieldDefs(entity: EntityType) {
  return useQuery({ queryKey: ["cf-defs", entity], queryFn: () => customFieldsApi.defs(entity), staleTime: 5 * 60_000 });
}

export function useSaveFieldDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, create, update }: { id?: string; create?: CustomFieldDefInput; update?: CustomFieldDefUpdate }) =>
      id ? customFieldsApi.updateDef(id, update ?? {}) : customFieldsApi.createDef(create!),
    onSuccess: (_d, v) => {
      toast.success(v.id ? "Field saved" : "Field added");
      void qc.invalidateQueries({ queryKey: ["cf-defs"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the field")),
  });
}

export function useDeleteFieldDef() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => customFieldsApi.deleteDef(id),
    onSuccess: (r) => {
      toast.success(r.values_removed ? `Field deleted with ${r.values_removed} saved values` : "Field deleted");
      void qc.invalidateQueries({ queryKey: ["cf-defs"] });
      void qc.invalidateQueries({ queryKey: ["cf-values"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not delete the field")),
  });
}
