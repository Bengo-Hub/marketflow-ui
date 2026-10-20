"use client";

import { useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Globe, Bell, ExternalLink, Settings, Shield } from "lucide-react";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { OutletFilter } from "@/components/layout/outlet-filter";
import { useVisibleServices, serviceTagsFromAccessToken, AppSwitcherGrid, AppSwitcherTrigger, type ServiceKey } from "@bengo-hub/shared-ui-lib/app-switcher";

// marketflow-ui never wired the shared app-switcher before — this is its first adoption.
// 'marketflow' itself is omitted (never links to itself, mirrors every other *-ui).
const SERVICE_URLS: Partial<Record<ServiceKey, string>> = {
  pos: process.env.NEXT_PUBLIC_POS_UI_URL ?? "https://pos.codevertexafrica.com",
  inventory: process.env.NEXT_PUBLIC_INVENTORY_UI_URL ?? "https://inventory.codevertexafrica.com",
  treasury: process.env.NEXT_PUBLIC_TREASURY_UI_URL ?? "https://books.codevertexafrica.com",
  erp: process.env.NEXT_PUBLIC_ERP_UI_URL ?? "https://erp.codevertexafrica.com",
  ordering: process.env.NEXT_PUBLIC_ORDERING_UI_URL ?? "https://ordering.codevertexafrica.com",
  subscriptions: process.env.NEXT_PUBLIC_SUBSCRIPTIONS_UI_URL ?? "https://pricing.codevertexafrica.com",
  auth: process.env.NEXT_PUBLIC_AUTH_UI_URL ?? "https://accounts.codevertexafrica.com",
  projects: process.env.NEXT_PUBLIC_PROJECTS_UI_URL ?? "https://projects.codevertexafrica.com",
  afya: process.env.NEXT_PUBLIC_HOSPITAL_UI_URL ?? "https://afya.codevertexafrica.com",
};

export function AppHeader() {
  const { user, logout, session } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [showNotifications, setShowNotifications] = useState(false);
  const onPlatformRoute = pathname?.startsWith("/platform") ?? false;

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "MF";

  const tenantSlug = user?.tenantSlug || orgSlug;
  const publicUrl = `https://marketflow.codevertexafrica.com/p/${tenantSlug}`;

  // The App Store shows every real service to every authenticated user in the tenant — each
  // destination service already enforces its own RBAC + subscription gating on arrival.
  // A service outside the plan stays visible as "Not in your plan" with a link to the plans page
  // (shared-ui-lib default), so tenants discover the rest of the suite without hitting a 403.
  const services = useVisibleServices({
    orgSlug,
    urls: SERVICE_URLS,
    canManageLinks: true,
    activeServiceTags: serviceTagsFromAccessToken(session?.accessToken),
    upgradeUrl: SERVICE_URLS.subscriptions ? `${SERVICE_URLS.subscriptions}/${orgSlug}` : null,
  });

  return (
    <header className="flex h-14 items-center gap-3 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />

      {/* Cross-tenant drill-in selector — confined to /platform routes (self-gated). */}
      {user?.isPlatformOwner && <TenantSwitcher />}

      {/* Return-to-platform affordance for platform owners on tenant (business) pages,
          where the cross-tenant selector is intentionally hidden. */}
      {user?.isPlatformOwner && !onPlatformRoute && (
        <button
          type="button"
          onClick={() => router.push("/platform")}
          className="inline-flex h-8 items-center gap-1.5 rounded-md border bg-background px-3 text-sm hover:bg-accent"
        >
          <Shield className="h-4 w-4 text-muted-foreground" />
          <span className="hidden sm:inline">Platform console</span>
        </button>
      )}

      {/* Outlet filter for HQ/admin users (non-platform owners with multi-outlet tenants) */}
      <OutletFilter />

      <div className="flex-1" />

      {/* Public website link */}
      <a
        href={publicUrl}
        target="_blank"
        rel="noreferrer"
        className="hidden sm:inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs text-muted-foreground hover:text-foreground hover:border-amber-300 transition"
      >
        <Globe className="h-3 w-3" />
        My website
        <ExternalLink className="h-2.5 w-2.5" />
      </a>

      {/* Notifications */}
      <div className="relative">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 relative"
          onClick={() => setShowNotifications(!showNotifications)}
        >
          <Bell className="h-4 w-4" />
          <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-amber-500" />
        </Button>

        {showNotifications && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
            <div className="absolute right-0 top-10 z-50 w-80 rounded-xl border bg-card shadow-lg">
              <div className="border-b px-4 py-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold">Notifications</h3>
                <Badge variant="outline" className="text-[10px]">0 new</Badge>
              </div>
              <div className="p-6 text-center text-sm text-muted-foreground">
                <Bell className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                No new notifications
              </div>
            </div>
          </>
        )}
      </div>

      {user?.isPlatformOwner && (
        <Badge variant="outline" className="hidden sm:inline-flex text-[10px] text-amber-700 border-amber-200">
          Platform owner
        </Badge>
      )}

      <AppSwitcherTrigger services={services} />

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger className="relative h-8 w-8 rounded-full outline-none cursor-pointer">
          <Avatar className="h-8 w-8">
            <AvatarFallback style={{ backgroundColor: "var(--brand-primary)", color: "#000" }}>
              {initials}
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
          <div className="flex items-center gap-2 p-2">
            <div className="flex flex-col space-y-0.5">
              <p className="text-sm font-medium">{user?.fullName || user?.email}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => router.push(`/${orgSlug}/settings/profile`)}>
            <User className="mr-2 h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => router.push(`/${orgSlug}/settings`)}>
            <Settings className="mr-2 h-4 w-4" />
            Settings
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => window.open(publicUrl, "_blank")}>
            <Globe className="mr-2 h-4 w-4" />
            View public page
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <div className="px-2 py-1.5">
            <AppSwitcherGrid services={services} />
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={logout} className="text-destructive">
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
