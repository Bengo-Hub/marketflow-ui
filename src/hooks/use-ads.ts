"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/api/errors";
import { adsApi, type BoostInput } from "@/lib/api/ads";

export function useAdAccounts(enabled = true) {
  return useQuery({ queryKey: ["ad-accounts"], queryFn: adsApi.accounts, enabled, staleTime: 60_000, retry: 1 });
}

/** The live quote; it refreshes when the account, budget or days change. */
export function useAdQuote(accountID: string, budget: number, days: number) {
  return useQuery({
    queryKey: ["ad-quote", accountID, budget, days],
    queryFn: () => adsApi.quote({ ad_account_connected_id: accountID, budget, days }),
    enabled: !!accountID && budget > 0 && days > 0,
    staleTime: 30_000,
    retry: false,
  });
}

/** A boost's progress; it polls while the launch is still on its way. */
export function useBoost(id: string | null) {
  return useQuery({
    queryKey: ["boost", id],
    queryFn: () => adsApi.get(id as string),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.status === "launching" ? 15_000 : false),
  });
}

export function useLaunchBoost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (b: BoostInput) => adsApi.boost(b),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["ad-accounts"] }),
    // The dialog shows the reason inline.
  });
}

export function useBoostAction(fn: (id: string) => Promise<unknown>, ok: string, fail: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (_d, id) => {
      toast.success(ok);
      void qc.invalidateQueries({ queryKey: ["boost", id] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, fail)),
  });
}
