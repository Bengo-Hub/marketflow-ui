import { apiClient } from "./client";
import type { Paginated } from "./types";

/** GET /api/v1/admin/tenants returns {tenants, total} (not the {data} envelope). */
export interface AdminTenant {
  id: string;
  slug: string;
  name: string;
  business_type?: string;
  status?: string;
  country?: string;
  created_at: string;
}

export interface ServiceConfig {
  id: string;
  tenant_id?: string;
  config_key: string;
  config_value: string;
  config_type: string;
  description?: string;
  is_secret: boolean;
  is_override: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditEntry {
  id: string;
  tenant_id?: string;
  scope: string;
  event: string;
  actor?: string;
  subject_type?: string;
  subject_id?: string;
  payload?: Record<string, unknown>;
  occurred_at: string;
}

export const adminApi = {
  tenants: () => apiClient.get<{ tenants: AdminTenant[]; total: number }>("/api/v1/admin/tenants").then((r) => r.data.tenants ?? []),
  platformConfig: () => apiClient.get<{ data: ServiceConfig[] }>("/api/v1/admin/service-config").then((r) => r.data.data ?? []),
  upsertPlatformConfig: (key: string, body: { config_value: string; description?: string }) =>
    apiClient.put<ServiceConfig>(`/api/v1/admin/service-config/${encodeURIComponent(key)}`, body).then((r) => r.data),
  tenantConfig: (tenantId: string) =>
    apiClient.get<{ data: ServiceConfig[] }>(`/api/v1/admin/service-config/tenant/${tenantId}`).then((r) => r.data.data ?? []),
  upsertTenantConfig: (tenantId: string, key: string, body: { config_value: string; description?: string }) =>
    apiClient
      .put<ServiceConfig>(`/api/v1/admin/service-config/tenant/${tenantId}/${encodeURIComponent(key)}`, body)
      .then((r) => r.data),
  platformAudit: (params: { event?: string; page?: number; limit?: number }) =>
    apiClient.get<Paginated<AuditEntry>>("/api/v1/admin/audit", { params }).then((r) => r.data),
};

/** The signed-in tenant's own activity log (GET /api/v1/analytics/audit). */
export const auditApi = {
  list: (params: { event?: string; page?: number; limit?: number }) =>
    apiClient.get<Paginated<AuditEntry>>("/api/v1/analytics/audit", { params }).then((r) => r.data),
};
