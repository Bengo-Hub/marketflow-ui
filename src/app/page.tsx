"use client";

import { useEffect } from "react";
import { useAuthStore } from "@/store/auth-store";

export default function RootPage() {
  const { status, user, initialize, redirectToSSO } = useAuthStore();

  useEffect(() => {
    if (status === "idle") initialize();
  }, [status, initialize]);

  useEffect(() => {
    if (status === "authenticated" && user?.tenantSlug) {
      window.location.href = `/${user.tenantSlug}/dashboard`;
    } else if (status === "unauthenticated") {
      redirectToSSO(window.location.href);
    }
  }, [status, user, redirectToSSO]);

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)] mx-auto mb-4" />
        <p className="text-muted-foreground">Loading MarketFlow...</p>
      </div>
    </div>
  );
}
