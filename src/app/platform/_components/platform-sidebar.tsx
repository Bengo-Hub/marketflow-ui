"use client";

import { Sidebar, SidebarContent, SidebarHeader } from "@/components/ui/sidebar";
import { NavLink, platformItems } from "@/components/layout/app-sidebar";

/** Platform console navigation: the same items and link style as the tenant sidebar's console group. */
export function PlatformSidebar() {
  return (
    <Sidebar variant="floating">
      <SidebarHeader className="p-3">
        <div className="flex items-center gap-3 px-2 pt-2">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary font-display text-sm font-semibold text-primary-foreground">
            MF
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-semibold">MarketFlow</p>
            <p className="text-xs text-sidebar-foreground/60">Platform console</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <nav aria-label="Platform" className="space-y-1 px-3 py-3">
          {platformItems.map((item) => (
            <NavLink key={item.href} item={item} href={item.href} exact={item.href === "/platform"} />
          ))}
        </nav>
      </SidebarContent>
    </Sidebar>
  );
}
