"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { PlatformSidebar } from "./_components/platform-sidebar";

// Platform admin surface — strictly gated by the IsPlatformOwner claim.
// Tenant users never reach this route group; they are redirected to SSO or 403.
export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { status, user, initialize, redirectToSSO, isPlatformOwner } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "idle") initialize();
  }, [status, initialize]);

  useEffect(() => {
    if (status === "unauthenticated" && !pathname?.includes("/auth")) {
      redirectToSSO(window.location.href);
    }
  }, [status, pathname, redirectToSSO]);

  useEffect(() => {
    if (status === "authenticated" && user && !isPlatformOwner()) {
      router.replace("/403");
    }
  }, [status, user, isPlatformOwner, router]);

  if (status === "idle" || status === "loading" || status === "syncing") {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-[var(--brand-primary)]" />
      </div>
    );
  }

  if (status !== "authenticated" || !isPlatformOwner()) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <PlatformSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6">
            <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Platform console — sensitive configuration. Changes here affect every tenant.
            </div>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
