"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

export default function OrgLayout({ children }: { children: React.ReactNode }) {
  const { status, user, initialize, redirectToSSO } = useAuthStore();
  const pathname = usePathname();

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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[var(--brand-primary)]" />
      </div>
    );
  }

  // Auth callback pages don't get the sidebar
  if (pathname?.includes("/auth/")) {
    return <>{children}</>;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <AppHeader />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
