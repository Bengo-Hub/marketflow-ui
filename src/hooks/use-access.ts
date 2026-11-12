"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { accessApi } from "@/lib/api/access";
import { canPublish, isRestricted } from "@/lib/access/role-access";
import { useAuthStore } from "@/store/auth-store";

/** The caller's MarketFlow role in this organisation (GET /api/v1/me/access). */
export function useMyAccess() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const signedIn = useAuthStore((s) => s.status === "authenticated");
  return useQuery({
    queryKey: ["my-access", orgSlug],
    queryFn: accessApi.me,
    enabled: !!orgSlug && signedIn,
    staleTime: 60_000,
    retry: 1,
  });
}

/** True for a role that works from an allow-list (the Meta App Review account). */
export function useIsRestricted(): boolean {
  const { data } = useMyAccess();
  return isRestricted(data);
}

/** May post an approved ad and boost it. Unknown yet: show it and let the API decide. */
export function useCanPublish(): boolean {
  const platformOwner = useAuthStore((s) => s.user?.isPlatformOwner ?? false);
  const access = useMyAccess();
  if (platformOwner) return true;
  if (!access.data) return !access.isSuccess;
  return canPublish(access.data);
}
