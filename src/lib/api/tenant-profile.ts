import { apiClient } from "./client";
import type { PublicMetadata } from "./public";
import type { BusinessTypeOption } from "@/lib/business-types";
import type { LeadFilterResponse, LeadFilterWords } from "@/lib/leads/lead-filter-settings";
import type { LeadResponseResponse, LeadResponseView } from "@/lib/leads/lead-response-settings";

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
  /** The currency every amount is shown and entered in (marketflow-api resolves it). */
  currency?: string;
  /** Where it came from: the owner's choice, the SSO country, or the platform default. */
  currency_source?: "tenant" | "country" | "platform";
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
    /** Private: where the business is, so its ads show scenes from its own town. */
    business_address?: string;
    business_city?: string;
    /** The owner's currency; null or "" goes back to the country or platform default. */
    currency?: string | null;
    /** Item 61: the tenant's own words that mark a submission as not a lead; null clears them. */
    lead_filter?: Partial<LeadFilterWords> | null;
    /** Item 62: the tenant's lead response overrides; null goes back to the platform defaults. */
    lead_response?: Partial<LeadResponseView> | null;
  };
}

/** GET /api/v1/tenant/profile/kes-rate: KES per unit of a currency (treasury's rate). */
export interface KESRate {
  currency: string;
  kes_per: number;
  source: "treasury" | "same";
}

export const tenantProfileApi = {
  get: () => apiClient.get<TenantProfile>("/api/v1/tenant/profile").then((r) => r.data),
  update: (body: TenantProfileUpdate) => apiClient.patch<TenantProfile>("/api/v1/tenant/profile", body).then((r) => r.data),
  /** The business types an owner can pick, each with a label and description (Sprint 7 #32). */
  businessTypes: () =>
    apiClient
      .get<{ business_types: BusinessTypeOption[] }>("/api/v1/tenant/profile/business-types")
      .then((r) => r.data.business_types ?? []),
  /** The platform's lead filter words (read only) and the tenant's own (item 61). */
  leadFilter: () => apiClient.get<LeadFilterResponse>("/api/v1/tenant/profile/lead-filter").then((r) => r.data),
  /** Lead response settings beside the platform defaults, and the follow-up sequence (item 62). */
  leadResponse: () => apiClient.get<LeadResponseResponse>("/api/v1/tenant/profile/lead-response").then((r) => r.data),
  /** KES per unit of currency (default the tenant's); 503 no_rate when treasury has none. */
  kesRate: (currency?: string) =>
    apiClient
      .get<KESRate>("/api/v1/tenant/profile/kes-rate", { params: currency ? { currency } : undefined })
      .then((r) => r.data),
};
