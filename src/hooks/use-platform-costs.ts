"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { platformCostsApi } from "@/lib/api/platform-costs";
import type { CostReportQuery } from "@/lib/platform-costs";

/** One month of the platform cost and margin report, a page of tenants at a time. */
export function usePlatformCostReport(q: CostReportQuery) {
  return useQuery({
    queryKey: ["admin", "cost-report", q.month, q.page ?? 1, q.page_size ?? null],
    queryFn: () => platformCostsApi.report(q),
    placeholderData: keepPreviousData,
    staleTime: 60_000,
  });
}
