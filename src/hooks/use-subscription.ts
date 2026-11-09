"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/auth-store";
import { useSubscriptionStore } from "@/store/subscription";
import { fetchSubscriptionInfo } from "@/lib/auth/subscription";

/** The unverified payload of a JWT, or {} when it cannot be read. */
function tokenClaims(token?: string | null): { billing_mode?: string; is_demo?: boolean; sub_exempt?: boolean } {
  const part = token?.split(".")[1];
  if (!part || typeof atob !== "function") return {};
  try {
    return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=")));
  } catch {
    return {};
  }
}

export function useSubscription() {
  const user = useAuthStore((s) => s.user);
  const session = useAuthStore((s) => s.session);
  const status = useAuthStore((s) => s.status);

  const store = useSubscriptionStore();

  const tenantId = user?.tenantId ?? null;
  const tenantSlug = user?.tenantSlug ?? null;
  const isPlatformOwner = user?.isPlatformOwner ?? false;
  // The gating exemptions live on the access token (auth-client Claims.IsGatingExempt), not on the
  // user profile. Read them from its payload for display only; every server checks the signed token.
  const claims = tokenClaims(session?.accessToken);
  const isServiceCharge = claims.billing_mode === "service_charge";
  const isDemo = !!claims.is_demo || tenantSlug === "codevertex-demo";
  const isSubscriptionExempt = !!claims.sub_exempt;

  // Hydrate store from IDB on auth
  useEffect(() => {
    if (status !== "authenticated" || !tenantSlug) return;
    useSubscriptionStore.getState().loadFromIDB(tenantSlug);
  }, [status, tenantSlug]);

  // Fetch from API once per session (using auth store quick-init first)
  const fetchedRef = useRef(false);
  useEffect(() => {
    if (status !== "authenticated" || !session?.accessToken || !user || fetchedRef.current) return;
    if (isPlatformOwner || !tenantId) {
      useSubscriptionStore.getState().setFromRaw(
        { plan: "ENTERPRISE", status: "ACTIVE", features: [], limits: {} },
        tenantSlug ?? "",
      );
      fetchedRef.current = true;
      return;
    }

    // Quick-init from SSO-provided subscription fields to avoid loading flash
    if (user.subscriptionPlan || user.subscriptionStatus) {
      useSubscriptionStore.getState().setFromRaw(
        {
          plan: user.subscriptionPlan ?? null,
          status: user.subscriptionStatus ?? null,
          features: [],
          limits: {},
        },
        tenantSlug ?? "",
      );
    }

    fetchedRef.current = true;
    fetchSubscriptionInfo(tenantId, tenantSlug ?? "", session.accessToken)
      .then((info) => {
        if (!info || !tenantSlug) return;
        useSubscriptionStore.getState().setFromRaw(
          {
            plan: info.planCode || null,
            tierOrder: info.tierOrder ?? null,
            status: info.status || null,
            expiresAt: info.currentPeriodEnd ?? info.trialEndsAt ?? null,
            features: info.features,
            limits: info.limits,
          },
          tenantSlug,
        );
      })
      .catch(() => {});
  }, [status, session?.accessToken, user, tenantId, tenantSlug, isPlatformOwner]);

  // Re-fetch when tab becomes visible (user returned from renewal tab)
  const lastHiddenAt = useRef<number | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const REFRESH_AFTER_MS = 5 * 60 * 1000;
    const onVisibility = () => {
      if (document.visibilityState === "hidden") { lastHiddenAt.current = Date.now(); return; }
      if (document.visibilityState === "visible" && lastHiddenAt.current !== null) {
        const awayMs = Date.now() - lastHiddenAt.current;
        lastHiddenAt.current = null;
        if (awayMs >= REFRESH_AFTER_MS && tenantId && tenantSlug && session?.accessToken) {
          fetchedRef.current = false;
          fetchSubscriptionInfo(tenantId, tenantSlug, session.accessToken)
            .then((info) => {
              if (!info) return;
              useSubscriptionStore.getState().setFromRaw(
                { plan: info.planCode || null, tierOrder: info.tierOrder ?? null, status: info.status || null, expiresAt: info.currentPeriodEnd ?? info.trialEndsAt ?? null, features: info.features, limits: info.limits },
                tenantSlug,
              );
            })
            .catch(() => {});
        }
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [tenantId, tenantSlug, session?.accessToken]);

  const subStatus = store.status?.toLowerCase() ?? null;

  return {
    store,
    status: subStatus,
    plan: store.plan,
    tierOrder: store.tierOrder,
    isActive: subStatus === "active" || subStatus === "trial" || isServiceCharge || isDemo || isSubscriptionExempt,
    isPastDue: subStatus === "suspended",
    isExpired: store.isExpired,
    isInGracePeriod: store.isInGracePeriod,
    needsSubscription: subStatus === "none" && !isPlatformOwner && !isServiceCharge && !isDemo && !isSubscriptionExempt,
    isLoading: !store.hydrated,
    isPlatformOwner,
    isServiceCharge,
    isDemo,
    isSubscriptionExempt,
    isCommercialTenant: !isPlatformOwner,
    hasFeature: (code: string) => store.features.includes(code),
    getLimit: (key: string) => (store.limits[key] ?? Infinity) as number,
    daysUntilExpiry: store.daysUntilExpiry,
    gracePeriodEndsAt: store.gracePeriodEndsAt,
  };
}
