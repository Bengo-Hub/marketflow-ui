"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { tenantProfileApi, type TenantProfileUpdate } from "@/lib/api/tenant-profile";
import { apiErrorMessage } from "@/lib/api/errors";
import { FALLBACK_CURRENCY } from "@/lib/money";

export function useTenantProfile() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["tenant-profile", orgSlug],
    queryFn: tenantProfileApi.get,
    staleTime: 30_000,
  });
}

/**
 * The tenant's currency for every amount shown or entered: the owner's choice in Settings, else
 * the SSO country's currency, else the platform default (resolved by marketflow-api).
 */
export function useTenantCurrency(): string {
  const profile = useTenantProfile();
  return profile.data?.currency || FALLBACK_CURRENCY;
}

/** The business types an owner can pick; the list changes only with a release. */
export function useBusinessTypes() {
  return useQuery({
    queryKey: ["business-types"],
    queryFn: tenantProfileApi.businessTypes,
    staleTime: 60 * 60_000,
  });
}

export function useUpdateTenantProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: TenantProfileUpdate) => tenantProfileApi.update(body),
    onSuccess: () => {
      toast.success("Profile saved");
      void qc.invalidateQueries({ queryKey: ["tenant-profile"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not save the profile")),
  });
}
