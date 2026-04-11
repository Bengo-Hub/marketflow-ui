"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";

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
      if (user?.tenantSlug) {
        router.replace(returnTo || `/${user.tenantSlug}/dashboard`);
      } else {
        router.replace(returnTo || "/");
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
