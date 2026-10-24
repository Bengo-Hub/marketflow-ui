"use client";

import { useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/store/auth-store";
import { useTenantBranding } from "@bengo-hub/shared-ui-lib/tenant";
import { MediaImage } from "@/components/media-image";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, UserCheck, BookOpen, Link2, MessageSquare,
  Settings, Megaphone, Globe, Mail, Calendar, Sun, Moon, Shield, Building2,
  Briefcase, Activity, CheckSquare, ChevronDown, LogOut, UsersRound, Filter,
  SlidersHorizontal, Workflow, Palette, UserCircle, CreditCard, PlugZap, Quote,
  ScrollText, Gauge, KeyRound, Cog, Receipt, ImageIcon,
} from "lucide-react";
import { useTheme } from "next-themes";
import { FeatureLock, useFeature } from "@bengo-hub/shared-ui-lib/subscription";

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
  /** Subscription feature code required to open this item. */
  feature?: string;
}

interface NavGroup {
  label: string;
  defaultCollapsed?: boolean;
  items: NavItem[];
}

export const navGroups: NavGroup[] = [
  {
    label: "Marketing",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
      { label: "Marketing team", icon: UsersRound, href: "/team" },
      { label: "Leads", icon: Users, href: "/leads", feature: "lead_management" },
      { label: "Contacts", icon: UserCheck, href: "/contacts", feature: "contact_management" },
      { label: "Campaigns", icon: Megaphone, href: "/campaigns", feature: "basic_campaigns" },
      { label: "Studio", icon: ImageIcon, href: "/studio" },
      { label: "Funnels", icon: Globe, href: "/funnels", feature: "funnel_builder" },
      { label: "Sequences", icon: Mail, href: "/sequences", feature: "email_sequences" },
      { label: "Chat", icon: MessageSquare, href: "/chat", feature: "ai_chat_agent" },
      { label: "Meetings", icon: Calendar, href: "/meetings" },
      { label: "Short links", icon: Link2, href: "/short-links", feature: "shortlinks" },
      { label: "Knowledge base", icon: BookOpen, href: "/knowledge", feature: "knowledge_base" },
    ],
  },
  {
    label: "CRM",
    items: [
      { label: "Deals", icon: Briefcase, href: "/crm/deals", feature: "deal_pipeline" },
      { label: "Accounts", icon: Building2, href: "/crm/accounts" },
      { label: "Activities", icon: Activity, href: "/crm/activities" },
      { label: "Tasks", icon: CheckSquare, href: "/crm/tasks" },
      { label: "Segments", icon: Filter, href: "/crm/segments" },
    ],
  },
  {
    label: "Settings",
    defaultCollapsed: true,
    items: [
      { label: "All settings", icon: Settings, href: "/settings" },
      { label: "Public profile", icon: UserCircle, href: "/settings/profile" },
      { label: "Testimonials", icon: Quote, href: "/settings/testimonials" },
      { label: "Brand context", icon: Palette, href: "/settings/marketing-context" },
      { label: "Team members", icon: UsersRound, href: "/settings/team" },
      { label: "Integrations", icon: PlugZap, href: "/settings/integrations" },
      { label: "Custom fields", icon: SlidersHorizontal, href: "/settings/custom-fields" },
      { label: "Agents", icon: Workflow, href: "/settings/agents" },
      { label: "Billing", icon: CreditCard, href: "/settings/billing" },
      { label: "Activity log", icon: ScrollText, href: "/settings/audit" },
    ],
  },
];

export const platformItems: NavItem[] = [
  { label: "Platform home", icon: Shield, href: "/platform" },
  { label: "Tenants", icon: Building2, href: "/platform/tenants" },
  { label: "Providers", icon: KeyRound, href: "/platform/providers" },
  { label: "Billing", icon: Receipt, href: "/platform/billing" },
  { label: "Usage", icon: Gauge, href: "/platform/usage" },
  { label: "Service config", icon: Cog, href: "/platform/service-config" },
  { label: "Security", icon: Shield, href: "/platform/security" },
];

function isActive(pathname: string | null, href: string, exact: boolean) {
  if (!pathname) return false;
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({ item, href, exact }: { item: NavItem; href: string; exact?: boolean }) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile } = useSidebar();
  // useFeature treats exempt tenants (platform owner, demo, service charge) as enabled.
  const hasFeature = useFeature(item.feature ?? "");
  const active = isActive(pathname, href, !!exact);
  const Icon = item.icon;

  const link = (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      onClick={() => isMobile && setOpenMobile(false)}
      className={cn(
        "group flex min-h-11 items-center gap-3 rounded-2xl px-2.5 text-sm font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground shadow-soft"
          : "text-sidebar-foreground/75 hover:bg-primary/8 hover:text-sidebar-foreground",
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
          active ? "bg-white/15" : "bg-primary/8 text-primary",
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="truncate">{item.label}</span>
    </Link>
  );

  // Show but lock: clicking a locked item opens the upgrade dialog instead of navigating.
  if (item.feature && !hasFeature) {
    return (
      <FeatureLock feature={item.feature} mode="badge">
        {link}
      </FeatureLock>
    );
  }
  return link;
}

function NavGroupSection({ group, orgSlug, initialOpen }: { group: NavGroup; orgSlug: string; initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="group/header mb-1 flex min-h-8 w-full items-center justify-between px-2.5"
        aria-expanded={open}
      >
        <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/45 transition-colors group-hover/header:text-sidebar-foreground/70">
          {group.label}
        </span>
        <ChevronDown className={cn("h-3.5 w-3.5 text-sidebar-foreground/40 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-1">
          {group.items.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              href={`/${orgSlug}${item.href}`}
              exact={item.href === "/dashboard" || item.href === "/settings"}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function BrandBlock({ orgSlug }: { orgSlug: string }) {
  const { tenant } = useTenantBranding();
  const name = tenant?.orgName || tenant?.name || orgSlug;
  return (
    <div className="flex items-center gap-3 px-2 pt-2">
      {tenant?.logoUrl ? (
        <MediaImage src={tenant.logoUrl} alt={name} className="h-11 w-11 shrink-0 rounded-2xl bg-white object-contain p-1" />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary font-display text-sm font-semibold text-primary-foreground">
          {(name || "MF").slice(0, 2).toUpperCase()}
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate font-display text-sm font-semibold text-sidebar-foreground">{name}</p>
        <p className="text-xs text-sidebar-foreground/60">MarketFlow</p>
      </div>
    </div>
  );
}

export function AppSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const orgSlug = params?.orgSlug as string;
  const { user } = useAuthStore();
  const logout = useAuthStore((s) => s.logout);
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  function isGroupInitiallyOpen(group: NavGroup): boolean {
    if (!group.defaultCollapsed) return true;
    return group.items.some((item) => isActive(pathname, `/${orgSlug}${item.href}`, item.href === "/settings"));
  }

  const displayName = user?.fullName || user?.email?.split("@")[0] || orgSlug;
  const displayInitial = displayName?.[0]?.toUpperCase() ?? "M";

  return (
    <Sidebar variant="floating">
      <SidebarHeader className="p-3">
        <BrandBlock orgSlug={orgSlug} />
      </SidebarHeader>

      <SidebarContent>
        <nav aria-label="Main" className="flex-1 space-y-5 overflow-y-auto px-3 py-3 scrollbar-hide">
          {navGroups.map((group) => (
            <NavGroupSection key={group.label} group={group} orgSlug={orgSlug} initialOpen={isGroupInitiallyOpen(group)} />
          ))}

          {user?.isPlatformOwner && (
            <div>
              <p className="mb-1 px-2.5 text-[11px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/45">
                Platform console
              </p>
              <div className="space-y-1">
                {platformItems.map((item) => (
                  <NavLink key={item.href} item={item} href={item.href} exact={item.href === "/platform"} />
                ))}
              </div>
            </div>
          )}
        </nav>
      </SidebarContent>

      <SidebarFooter className="space-y-2 p-3">
        <button
          type="button"
          onClick={() => setTheme(dark ? "light" : "dark")}
          className="flex min-h-11 w-full items-center gap-3 rounded-2xl px-2.5 text-sm font-medium text-sidebar-foreground/75 transition-colors hover:bg-primary/8 hover:text-sidebar-foreground"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/8 text-primary">
            {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </span>
          {dark ? "Light mode" : "Dark mode"}
        </button>

        <div className="flex items-center gap-3 rounded-2xl border border-white/60 bg-white/40 p-2.5 dark:border-white/10 dark:bg-white/5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-sm font-semibold text-primary">
            {displayInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-sidebar-foreground">{displayName}</p>
            <p className="truncate text-xs text-sidebar-foreground/60">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            aria-label="Sign out"
            className="flex h-9 w-9 items-center justify-center rounded-xl text-sidebar-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
