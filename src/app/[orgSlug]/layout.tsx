"use client";

import { useEffect } from "react";
import { usePathname, useParams } from "next/navigation";
import { PWAUpdateBanner } from "@/components/pwa-update-banner";
import { PlatformScopeGuard } from "@/components/layout/platform-scope-guard";
import { useAuthStore } from "@/store/auth-store";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";
import { SubscriptionBanner } from "@/components/subscription/subscription-banner";
import { VerifyEmailPrompt } from "@/components/auth/VerifyEmailPrompt";
import { SubscriptionEntitlementsProvider } from "@/components/subscription/subscription-entitlements-provider";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AppCanvas } from "@/components/ui-kit";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { status, user, initialize, redirectToSSO } = useAuthStore();
  const pathname = usePathname();
  const params = useParams();
  const orgSlug = params?.orgSlug as string | undefined;

  // Inject tenant-specific manifest link
  useEffect(() => {
    if (!orgSlug) return;
    const href = `/${orgSlug}/manifest.webmanifest`;
    let link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'manifest';
      document.head.appendChild(link);
    }
    if (link.href !== new URL(href, window.location.href).href) {
      link.href = href;
    }
  }, [orgSlug]);

  useEffect(() => {
    if (status === "idle") initialize();
  }, [status, initialize]);

  useEffect(() => {
    if (status === "unauthenticated" && !pathname?.includes("/auth")) {
      redirectToSSO(window.location.href);
    }
  }, [status, pathname, redirectToSSO]);

  // Show loading during auth init
  if (status === "idle" || status === "loading" || status === "syncing") {
    return (
      <div className="flex min-h-dvh items-center justify-center" role="status" aria-label="Loading">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary" />
      </div>
    );
  }

  // Auth callback pages don't get the sidebar
  if (pathname?.includes("/auth/")) {
    return <>{children}</>;
  }

  return (
    <SubscriptionEntitlementsProvider>
      <SidebarProvider>
        <PWAUpdateBanner />
        <PlatformScopeGuard />
        <div className="app-surface relative flex min-h-dvh w-full">
          <AppCanvas />
          <AppSidebar />
          <div className="flex min-w-0 flex-1 flex-col">
            <AppHeader />
            <SubscriptionBanner />
            <VerifyEmailPrompt />
            {/* The shell owns the padding and width; pages add only their own vertical rhythm. */}
            <main
              id="main"
              className="mx-auto w-full max-w-7xl flex-1 px-4 pb-[calc(6rem+env(safe-area-inset-bottom))] pt-5 sm:px-6 lg:px-8 lg:pb-12"
            >
              {children}
            </main>
          </div>
          <MobileNav />
        </div>
      </SidebarProvider>
    </SubscriptionEntitlementsProvider>
  );
}
