import { apiClient } from "./client";
import type { PublicMetadata } from "./public";
import type { BusinessTypeOption } from "@/lib/business-types";

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
  /** A key from GET /api/v1/tenant/profile/business-types; sent only when the owner changes it. */
  business_type?: string;
  /** Merged into the stored metadata; reserved keys (brand context, switches) are ignored by the API. */
  metadata?: Partial<PublicMetadata> & {
    /** Sprint 23 L45 sales follow-up settings (private). */
    sales_auto_reply?: boolean;
    sales_handoff_value?: number | null;
    /** The owner's AI label choice (owner 2026-11-14); unset means on. */
    ai_label?: "on" | "off";
    /** Sprint 7 report settings (Settings, Reports and emails); null clears a value. */
    weekly_report?: "on" | "off";
    average_sale_value?: number | null;
    email_footer?: string | null;
  };
}

export const tenantProfileApi = {
  get: () => apiClient.get<TenantProfile>("/api/v1/tenant/profile").then((r) => r.data),
  update: (body: TenantProfileUpdate) => apiClient.patch<TenantProfile>("/api/v1/tenant/profile", body).then((r) => r.data),
  /** The business types an owner can pick, each with a label and description (Sprint 7 #32). */
  businessTypes: () =>
    apiClient
      .get<{ business_types: BusinessTypeOption[] }>("/api/v1/tenant/profile/business-types")
      .then((r) => r.data.business_types ?? []),
};
