export interface SubscriptionInfo {
  status: string;
  planCode: string;
  planName: string;
  /** Tier rank of the resolved plan (1=Starter,2=Growth,3=Professional). Powers tier-aware gating. */
  tierOrder?: number;
  features: string[];
  limits: Record<string, number>;
  trialEndsAt?: string;
  currentPeriodEnd?: string;
}

export async function fetchSubscriptionInfo(
  tenantId: string,
  _tenantSlug: string,
  _accessToken: string,
): Promise<SubscriptionInfo | null> {
  if (!tenantId) return null;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const resp = await fetch(`/api/subscription?tenantId=${encodeURIComponent(tenantId)}`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;

    const data = await resp.json();
    const sub = data?.subscription ?? data;

    return {
      status: (sub.status ?? 'none').toLowerCase(),
      planCode: sub.plan_code ?? sub.planCode ?? '',
      planName: sub.plan_name ?? sub.planName ?? '',
      tierOrder: sub.tier_order ?? sub.tierOrder,
      features: sub.features ?? [],
      limits: sub.limits ?? {},
      trialEndsAt: sub.trial_ends_at ?? sub.trialEndsAt,
      currentPeriodEnd: sub.current_period_end ?? sub.currentPeriodEnd,
    };
  } catch {
    return null;
  }
}
