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

/** GET /api/v1/admin/usage: counts across every tenant (cached a minute server-side). */
export interface PlatformUsage {
  tenants: { total: number; active: number };
  leads: { total: number; this_week: number };
  chat_sessions: { this_week: number };
  campaigns: { active: number };
  meetings: { upcoming: number };
  nurture: { active_enrollments: number };
  leaderboard: { tenant_id: string; tenant_name: string; slug: string; leads_this_week: number }[];
  generated_at: string;
}

/** GET /api/v1/admin/encryption-key: which key encrypts provider secrets. The raw key is never returned. */
export interface EncryptionKeyStatus {
  configured: boolean;
  source: "db" | "env";
  key_fingerprint: string;
  updated_at: string | null;
}

export const adminApi = {
  encryptionKey: () => apiClient.get<EncryptionKeyStatus>("/api/v1/admin/encryption-key").then((r) => r.data),
  /** generate: true makes a new random key; key activates a base64 32-byte key the owner supplies. */
  setEncryptionKey: (body: { generate?: boolean; key?: string }) =>
    apiClient.put<EncryptionKeyStatus>("/api/v1/admin/encryption-key", body).then((r) => r.data),
  usage: () => apiClient.get<PlatformUsage>("/api/v1/admin/usage").then((r) => ({ ...r.data, leaderboard: r.data.leaderboard ?? [] })),
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
