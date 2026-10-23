"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { analyticsApi, type DashboardDays } from "@/lib/api/analytics";

/** Dashboard aggregates; the API caches them per tenant for a minute, so polling every minute is cheap. */
export function useDashboard(days: DashboardDays) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["analytics", "dashboard", orgSlug, days],
    queryFn: () => analyticsApi.dashboard(days),
    staleTime: 30_000,
    refetchInterval: 60_000,
    placeholderData: keepPreviousData,
  });
}

export function useProfileMetrics(days: DashboardDays) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["analytics", "profile", orgSlug, days],
    queryFn: () => analyticsApi.profile(days),
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });
}
