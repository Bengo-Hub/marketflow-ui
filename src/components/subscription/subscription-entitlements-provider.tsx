"use client";

import { useMemo } from "react";
import {
  SubscriptionProvider,
  type SubscriptionEntitlements,
} from "@bengo-hub/shared-ui-lib/subscription";
import { useSubscription } from "@/hooks/use-subscription";

/**
 * Bridges the app-local useSubscription hook (auth store + subscription store)
 * into the shared-ui-lib SubscriptionProvider so that useFeature / useAnyFeature /
 * FeatureGate work anywhere below the authenticated shell.
 *
 * isExempt mirrors the backend IsGatingExempt funnel: platform owner OR demo OR
 * service-charge billing — exempt tenants see every feature as enabled.
 */
export function SubscriptionEntitlementsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const sub = useSubscription();

  const entitlements = useMemo<SubscriptionEntitlements>(
    () => ({
      features: sub.store.features,
      limits: sub.store.limits,
      isExempt: sub.isPlatformOwner || sub.isDemo || sub.isServiceCharge,
      status: sub.status,
      isLoading: sub.isLoading,
    }),
    [
      sub.store.features,
      sub.store.limits,
      sub.isPlatformOwner,
      sub.isDemo,
      sub.isServiceCharge,
      sub.status,
      sub.isLoading,
    ],
  );

  return <SubscriptionProvider value={entitlements}>{children}</SubscriptionProvider>;
}
