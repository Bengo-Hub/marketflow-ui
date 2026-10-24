import axios from "axios";
import { apiClient, subscriptionsClient } from "./client";

/** GET /api/v1/subscription (subscriptions-api SubscriptionResult). */
export interface TenantSubscription {
  plan_code: string;
  plan_name: string;
  tier_order?: number;
  status: string;
  trial_ends_at?: string | null;
  current_period_start?: string;
  current_period_end?: string;
  cancelled_at?: string | null;
  features?: string[];
  limits?: Record<string, number>;
}

/** One metered figure for the current billing period; limit 0 or below means no cap. */
export interface UsageMetric {
  name: string;
  key: string;
  used: number;
  limit: number;
  unit: string;
  resetDate: string;
}

export interface UsageSummary {
  metrics: UsageMetric[];
  billingPeriod?: { start: string; end: string };
  plan?: string;
}

export type CreditService = "ai_credits" | "sms" | "whatsapp";

export interface CreditBundle {
  code: string;
  units: number;
  price_kes: number;
}

/** GET /api/v1/credits: one prepaid service as subscriptions-api sees it for this tenant. */
export interface CreditSnapshot {
  service: CreditService | string;
  label: string;
  exempt: boolean;
  covered: boolean;
  reason?: string;
  bundle_balance: number;
  quota_balance: number;
  unlimited: boolean;
  tier_code?: string;
  overage_pending_kes: number;
  overage_cap_kes: number;
  unit_price_kes: number;
  bundles: CreditBundle[];
}

export interface CreditLedgerEntry {
  id: string;
  action: "grant" | "topup" | "deduction" | "refund" | "adjustment" | "overage" | string;
  tokens: number;
  new_balance: number;
  description?: string;
  created_at: string;
}

export interface PurchaseIntent {
  intent_id: string;
  status: string;
  amount: string;
  currency: string;
  initiate_url?: string;
  authorization_url?: string;
}

/** GET /admin/credits/tenants: one business's position in one credit service (platform owner only). */
export interface AdminCreditRow {
  tenant_id: string;
  slug: string;
  name: string;
  exempt: boolean;
  plan_name?: string;
  plan_status?: string;
  status: "active" | "capped" | "not_activated" | "exempt" | string;
  activated: boolean;
  bundle_balance: number;
  quota_balance: number;
  unlimited: boolean;
  units_used_month: number;
  last_activity_at?: string | null;
}

export interface AdminCreditPage {
  service: string;
  data: AdminCreditRow[];
  total: number;
  limit: number;
  offset: number;
}

export interface TreasuryWallet {
  id: string;
  balance: number | string;
  currency: string;
  is_active: boolean;
}

const TREASURY_API_URL = (process.env.NEXT_PUBLIC_TREASURY_API_URL || "https://booksapi.codevertexafrica.com").replace(/\/$/, "");

export const billingApi = {
  subscription: () => subscriptionsClient.get<TenantSubscription>("/api/v1/subscription").then((r) => r.data),
  usage: () =>
    subscriptionsClient.get<UsageSummary>("/api/v1/usage").then((r) => ({ ...r.data, metrics: r.data.metrics ?? [] })),
  credits: () =>
    subscriptionsClient.get<{ services: CreditSnapshot[] }>("/api/v1/credits").then((r) => r.data.services ?? []),
  creditHistory: (service: CreditService, limit = 10) =>
    subscriptionsClient
      .get<{ data: CreditLedgerEntry[] }>(`/api/v1/credits/${service}/transactions`, { params: { limit } })
      .then((r) => r.data.data ?? []),
  buyCredits: (service: CreditService, code: string, returnUrl: string) =>
    subscriptionsClient
      .post<PurchaseIntent>(`/api/v1/credits/${service}/purchase`, { kind: "bundle", code, return_url: returnUrl })
      .then((r) => r.data),
  adminCredits: (params: { service: CreditService; q?: string; status?: string; limit: number; offset: number }) =>
    subscriptionsClient
      .get<AdminCreditPage>("/api/v1/admin/credits/tenants", {
        params: Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined && v !== "")),
      })
      .then((r) => ({ ...r.data, data: r.data.data ?? [] })),
  /** Adds units without a payment. The key makes a repeated click a no-op on the server. */
  grantCredits: (tenantId: string, service: CreditService, units: number, reason: string, key: string) =>
    subscriptionsClient
      .post(`/api/v1/admin/tenants/${tenantId}/credits/${service}/grant`, { units, reason, key })
      .then((r) => r.data),
  /**
   * The signed-in user's Treasury wallet. MarketFlow no longer takes ad money (ad budgets are
   * paid on the client's own ad account), so the page only shows money paid in under the old flow.
   */
  wallet: (tenantSlug: string) =>
    axios
      .get<TreasuryWallet>(`${TREASURY_API_URL}/api/v1/${encodeURIComponent(tenantSlug)}/wallets/me`, {
        headers: { Authorization: String(apiClient.defaults.headers.common.Authorization ?? "") },
        timeout: 15000,
      })
      .then((r) => r.data),
};

export function kes(n: number | string | undefined | null): string {
  const v = typeof n === "string" ? Number(n) : n ?? 0;
  return `KES ${(Number.isFinite(v) ? v : 0).toLocaleString("en-KE", { maximumFractionDigits: 2 })}`;
}
