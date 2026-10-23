"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { PlatformSidebar } from "./_components/platform-sidebar";
import { AppCanvas } from "@/components/ui-kit";
import { ShieldAlert } from "lucide-react";

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
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  if (status !== "authenticated" || !isPlatformOwner()) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="app-surface relative flex min-h-dvh w-full">
        <AppCanvas />
        <PlatformSidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main id="main" className="mx-auto w-full max-w-7xl flex-1 space-y-5 px-4 pb-12 pt-5 sm:px-6 lg:px-8">
            <div className="flex items-start gap-2 rounded-2xl border border-warning/25 bg-warning/10 px-4 py-3 text-sm text-warning">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              <span>Platform console. Changes here affect every tenant.</span>
            </div>
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
