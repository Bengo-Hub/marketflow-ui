import { apiClient } from "./client";
import type { PublicMetadata } from "./public";

/** GET/PATCH /api/v1/tenant/profile (marketflow-api tenant.Handler). */
export interface TenantProfile {
  id: string;
  slug: string;
  name: string;
  status?: string;
  business_type?: "flp" | "generic" | string;
  country?: string | null;
  whatsapp_number?: string | null;
  fbo_distrib_id?: string | null;
  flp_store_code?: string | null;
  flp_language?: string | null;
  /** The tenant's own view includes private keys too; the form only edits the public ones. */
  metadata?: PublicMetadata & Record<string, unknown>;
}

export interface TenantProfileUpdate {
  name?: string;
  whatsapp_number?: string;
  fbo_distrib_id?: string;
  flp_store_code?: string;
  flp_language?: string;
  country?: string;
  /** Merged into the stored metadata; reserved keys (brand context, switches) are ignored by the API. */
  metadata?: Partial<PublicMetadata>;
}

export const tenantProfileApi = {
  get: () => apiClient.get<TenantProfile>("/api/v1/tenant/profile").then((r) => r.data),
  update: (body: TenantProfileUpdate) => apiClient.patch<TenantProfile>("/api/v1/tenant/profile", body).then((r) => r.data),
};
