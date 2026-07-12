"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  SubscriptionProvider,
  type FeatureCatalogEntry,
  type SubscriptionEntitlements,
} from "@bengo-hub/shared-ui-lib/subscription";
import { useSubscription } from "@/hooks/use-subscription";

const UPGRADE_BASE =
  process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL || "https://pricing.codevertexitsolutions.com";

interface CatalogItem {
  featureCode: string;
  label?: string;
  serviceTag?: string;
  minPlanCode?: string;
  minTierLabel?: string;
  minTierOrder?: number;
}

/**
 * Bridges the app-local useSubscription hook (auth store + subscription store)
 * into the shared-ui-lib SubscriptionProvider so that useFeature / useAnyFeature /
 * FeatureLock / UpgradeDialog work anywhere below the authenticated shell.
 *
 * isExempt mirrors the backend IsGatingExempt funnel: platform owner OR demo OR
 * service-charge billing — exempt tenants see every feature as enabled.
 *
 * The feature catalog (minPlanCode/minTierLabel per feature) is fetched once from the
 * /api/features-catalog proxy so FeatureLock can render "Upgrade to <tier>" + pricing
 * deep-links without a hardcoded per-app feature→tier map.
 */
export function SubscriptionEntitlementsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const sub = useSubscription();

  // The catalog is static-ish → fetch once, long cache.
  const { data: catalogData } = useQuery({
    queryKey: ["features-catalog"],
    queryFn: async () => {
      const res = await fetch("/api/features-catalog");
      if (!res.ok) return { features: [] as CatalogItem[] };
      return (await res.json()) as { features: CatalogItem[] };
    },
    staleTime: 60 * 60 * 1000,
    retry: false,
  });

  const catalog = useMemo<Record<string, FeatureCatalogEntry>>(() => {
    const map: Record<string, FeatureCatalogEntry> = {};
    for (const f of catalogData?.features ?? []) {
      map[f.featureCode] = {
        minPlanCode: f.minPlanCode,
        minTierLabel: f.minTierLabel,
        minTierOrder: f.minTierOrder,
        serviceTag: f.serviceTag,
        label: f.label,
      };
    }
    return map;
  }, [catalogData]);

  const entitlements = useMemo<SubscriptionEntitlements>(
    () => ({
      features: sub.store.features,
      limits: sub.store.limits,
      isExempt: sub.isPlatformOwner || sub.isDemo || sub.isServiceCharge,
      status: sub.status,
      isLoading: sub.isLoading,
      planCode: sub.plan,
      tierOrder: sub.tierOrder,
      catalog,
      upgradeBaseUrl: UPGRADE_BASE,
    }),
    [
      sub.store.features,
      sub.store.limits,
      sub.isPlatformOwner,
      sub.isDemo,
      sub.isServiceCharge,
      sub.status,
      sub.isLoading,
      sub.plan,
      sub.tierOrder,
      catalog,
    ],
  );

  return <SubscriptionProvider value={entitlements}>{children}</SubscriptionProvider>;
}
