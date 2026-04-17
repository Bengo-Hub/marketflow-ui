"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Settings, Users } from "lucide-react";

const SUBSCRIPTIONS_URL = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_URL || "https://subscriptionsapi.codevertexitsolutions.com";

type ServiceChargePlan = {
  id: string;
  code: string;
  name: string;
  description: string;
  charge_type: string;
  charge_value: number;
  min_charge?: number;
  max_charge?: number;
  applicable_services?: string[];
  is_active: boolean;
  is_default: boolean;
};

type Plan = {
  id: string;
  plan_code: string;
  name: string;
  description: string;
  base_price: number;
  billing_cycle: string;
  currency: string;
  tier_limits?: Record<string, any>;
};

export default function PlatformBillingPage() {
  const { data: chargePlans, isLoading: chargesLoading } = useQuery<ServiceChargePlan[]>({
    queryKey: ["service-charge-plans"],
    queryFn: async () => {
      try {
        const r = await apiClient.get<{ data: ServiceChargePlan[] }>(
          `${SUBSCRIPTIONS_URL}/api/v1/service-charges/plans?service=marketflow`,
        );
        return r.data.data ?? [];
      } catch {
        return [];
      }
    },
  });

  const { data: plans, isLoading: plansLoading } = useQuery<Plan[]>({
    queryKey: ["subscription-plans"],
    queryFn: async () => {
      try {
        const r = await apiClient.get<{ data: Plan[] }>(`${SUBSCRIPTIONS_URL}/api/v1/plans`);
        return (r.data.data ?? []).filter((p: Plan) => p.plan_code?.startsWith("MF_") || p.name?.toLowerCase().includes("market"));
      } catch {
        return [];
      }
    },
  });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing Configuration</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configure service charges, AI credit pricing, and subscription plans for all MarketFlow tenants.
          Changes here affect every new campaign and billing cycle going forward.
        </p>
      </div>

      {/* Service Charge Plans */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Service Charge Plans</h2>
        </div>
        {chargesLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-40 rounded-xl" />
          </div>
        ) : (chargePlans ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No MarketFlow service charge plans found. Run the subscriptions-api seed to create SC_MARKETFLOW_ADS and SC_MARKETFLOW_AI_CREDIT.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {(chargePlans ?? []).map((plan) => (
              <Card key={plan.id}>
                <CardHeader className="flex flex-row items-start justify-between pb-2">
                  <div>
                    <CardTitle className="text-base">{plan.name}</CardTitle>
                    <Badge variant="outline" className="mt-1 text-xs">{plan.code}</Badge>
                  </div>
                  {plan.is_default && (
                    <Badge className="bg-green-100 text-green-800 text-xs">Default</Badge>
                  )}
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{plan.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-muted-foreground">Type:</span>{" "}
                      <span className="font-medium">{plan.charge_type}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Value:</span>{" "}
                      <span className="font-medium">
                        {plan.charge_type === "PERCENTAGE" ? `${plan.charge_value}%` : `KES ${plan.charge_value}`}
                      </span>
                    </div>
                    {plan.min_charge != null && (
                      <div>
                        <span className="text-muted-foreground">Min:</span>{" "}
                        <span className="font-medium">KES {plan.min_charge}</span>
                      </div>
                    )}
                    {plan.max_charge != null && (
                      <div>
                        <span className="text-muted-foreground">Max:</span>{" "}
                        <span className="font-medium">KES {plan.max_charge}</span>
                      </div>
                    )}
                  </div>
                  <Badge variant={plan.is_active ? "default" : "outline"} className="text-xs">
                    {plan.is_active ? "Active" : "Inactive"}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          To edit charge values, update the <code>ServiceChargePlan</code> rows in subscriptions-api
          or use the subscriptions admin UI. Changes take effect on the next campaign created.
        </p>
      </section>

      {/* Subscription Plans */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Subscription Plans</h2>
        </div>
        {plansLoading ? (
          <Skeleton className="h-40 rounded-xl" />
        ) : (plans ?? []).length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No MarketFlow subscription plans found. Seed the <code>marketflow</code> product in subscriptions-api.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {(plans ?? []).map((plan) => (
              <Card key={plan.id}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <Badge variant="outline" className="text-xs">{plan.plan_code}</Badge>
                </CardHeader>
                <CardContent className="text-sm space-y-1">
                  <div className="text-xl font-bold">
                    {plan.base_price === 0 ? "Free" : `${plan.currency} ${plan.base_price.toLocaleString()}`}
                    {plan.billing_cycle !== "ONE_TIME" && plan.base_price > 0 && (
                      <span className="text-xs text-muted-foreground font-normal">
                        /{plan.billing_cycle.toLowerCase()}
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground text-xs">{plan.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      {/* Tenant Overview */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <Users className="h-5 w-5 text-amber-500" />
          <h2 className="text-lg font-semibold">Tenant Subscriptions</h2>
        </div>
        <Card>
          <CardContent className="py-6 text-center text-sm text-muted-foreground">
            Per-tenant subscription management is available in the{" "}
            <a
              href="https://subscriptionsapi.codevertexitsolutions.com/swagger/index.html"
              target="_blank"
              rel="noreferrer"
              className="text-amber-600 underline"
            >
              subscriptions-api admin console
            </a>
            . Override plans, grant AI credits, or adjust limits per tenant from there.
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
