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
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-(--brand-primary)" />
      </div>
    );
  }

  // Auth callback pages don't get the sidebar
  if (pathname?.includes("/auth/")) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <PWAUpdateBanner />
      <PlatformScopeGuard />
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <SubscriptionBanner />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
