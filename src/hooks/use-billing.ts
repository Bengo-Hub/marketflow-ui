"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { billingApi, type CreditService } from "@/lib/api/billing";

/** Plan, usage and credits come from subscriptions-api; each query is scoped to the page's tenant. */
export function useTenantSubscription() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({ queryKey: ["billing", orgSlug, "subscription"], queryFn: billingApi.subscription, retry: 1 });
}

export function useUsage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({ queryKey: ["billing", orgSlug, "usage"], queryFn: billingApi.usage, retry: 1 });
}

export function useCredits() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({ queryKey: ["billing", orgSlug, "credits"], queryFn: billingApi.credits, retry: 1 });
}

export function useCreditHistory(service: CreditService, enabled: boolean) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["billing", orgSlug, "credits", service, "history"],
    queryFn: () => billingApi.creditHistory(service, 10),
    enabled,
  });
}

/** Money paid into the Treasury wallet under the retired ad-payment flow; shown only when above zero. */
export function useLegacyWallet() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["billing", orgSlug, "wallet"],
    queryFn: () => billingApi.wallet(orgSlug).catch(() => null),
    staleTime: 5 * 60_000,
  });
}
