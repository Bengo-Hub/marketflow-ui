"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { tenantProfileApi, type TenantProfileUpdate } from "@/lib/api/tenant-profile";
import { apiErrorMessage } from "@/lib/api/errors";

export function useTenantProfile() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  return useQuery({
    queryKey: ["tenant-profile", orgSlug],
    queryFn: tenantProfileApi.get,
    staleTime: 30_000,
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
