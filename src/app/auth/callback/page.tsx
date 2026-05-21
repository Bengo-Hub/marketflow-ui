"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { useOutletFilterStore } from "@/store/outlet-filter";

function CallbackHandler() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const hasStarted = useRef(false);

  useEffect(() => {
    const code = searchParams.get("code");
    if (!code || hasStarted.current) return;
    hasStarted.current = true;

    const callbackUrl = `${window.location.origin}/auth/callback`;
    const store = useAuthStore.getState();

    store.handleSSOCallback(code, callbackUrl).then(() => {
      const returnTo = sessionStorage.getItem("sso_return_to");
      sessionStorage.removeItem("sso_return_to");
      const user = useAuthStore.getState().user;

      // Auto-preselect outlet from JWT claims for non-platform, non-HQ users.
      if (user && !user.isPlatformOwner) {
        const storedOutlet = localStorage.getItem("marketflow-selected-outlet-id");
        if (!storedOutlet) {
          const jwtOutletId = (user as any)?.outlet_id || (user as any)?.outletId;
          const isHqUser = (user as any)?.is_hq_user || (user as any)?.isHqUser;
          if (jwtOutletId && !isHqUser) {
            useOutletFilterStore.getState().selectOutlet({
              id: jwtOutletId,
              code: (user as any)?.outlet_code ?? '',
              name: (user as any)?.outlet_code ?? '',
              useCase: (user as any)?.outlet_use_case,
            });
            localStorage.setItem("marketflow-selected-outlet-id", jwtOutletId);
          }
        }
      }

      if (returnTo) {
        router.replace(returnTo);
        return;
      }
      // Platform owners land on the platform console by default; tenant
      // users land on their dashboard. The sidebar on tenant pages still
      // exposes a "Platform console" shortcut for platform owners.
      if (user?.isPlatformOwner) {
        router.replace("/platform");
        return;
      }
      const slug = user?.preferredSlug || user?.tenantSlug || "";
      if (slug) {
        router.replace(`/${slug}/dashboard`);
      } else {
        router.replace("/");
      }
    });
  }, [searchParams, router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--brand-primary) mx-auto mb-4" />
        <p className="text-muted-foreground">Signing you in...</p>
      </div>
    </div>
  );
}

export default function SSOCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--brand-primary)" />
      </div>
    }>
      <CallbackHandler />
    </Suspense>
  );
}
