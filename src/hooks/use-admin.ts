"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { adminApi, auditApi } from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/errors";

export function useAdminTenants() {
  return useQuery({ queryKey: ["admin", "tenants"], queryFn: adminApi.tenants, staleTime: 5 * 60_000 });
}

/** Platform defaults (no tenant) or one tenant's overrides. */
export function useServiceConfig(tenantId: string | null) {
  return useQuery({
    queryKey: ["admin", "service-config", tenantId ?? "platform"],
    queryFn: () => (tenantId ? adminApi.tenantConfig(tenantId) : adminApi.platformConfig()),
  });
}

export function useUpsertServiceConfig(tenantId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ key, value, description }: { key: string; value: string; description?: string }) =>
      tenantId
        ? adminApi.upsertTenantConfig(tenantId, key, { config_value: value, description })
        : adminApi.upsertPlatformConfig(key, { config_value: value, description }),
    onSuccess: () => {
      toast.success("Setting saved");
      void qc.invalidateQueries({ queryKey: ["admin", "service-config"] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the setting")),
  });
}

export function useTenantAudit(event: string, page: number) {
  return useQuery({
    queryKey: ["audit", "tenant", event, page],
    queryFn: () => auditApi.list({ event: event || undefined, page, limit: 25 }),
    placeholderData: keepPreviousData,
  });
}

export function usePlatformAudit(event: string, page: number) {
  return useQuery({
    queryKey: ["audit", "platform", event, page],
    queryFn: () => adminApi.platformAudit({ event: event || undefined, page, limit: 25 }),
    placeholderData: keepPreviousData,
  });
}
