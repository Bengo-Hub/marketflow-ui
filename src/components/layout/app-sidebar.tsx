"use client";

import { useState } from "react";
import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/store/auth-store";
import { useBrand } from "@/contexts/BrandContext";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, UserCheck, BookOpen, Link2, MessageSquare,
  Settings, Megaphone, Globe, Mail, Calendar, Sun, Moon, Shield, Building2,
  Briefcase, Activity, CheckSquare, Users2, ChevronDown, LogOut,
  Cpu, Layers, UserCog, DatabaseBackup,
} from "lucide-react";
import { useTheme } from "next-themes";

// ── Types ──────────────────────────────────────────────────────────────────────

interface NavItem {
  label: string;
  icon: React.ElementType;
  href: string;
}

interface NavGroup {
  label: string;
  defaultCollapsed?: boolean;
  items: NavItem[];
}

// ── Nav groups ─────────────────────────────────────────────────────────────────

const navGroups: NavGroup[] = [
  {
    label: "Marketing",
    items: [
      { label: "Dashboard",    icon: LayoutDashboard, href: "/dashboard" },
      { label: "Leads",        icon: Users,           href: "/leads" },
      { label: "Contacts",     icon: UserCheck,       href: "/contacts" },
      { label: "Knowledge Base", icon: BookOpen,      href: "/knowledge" },
      { label: "Campaigns",    icon: Megaphone,       href: "/campaigns" },
      { label: "Funnels",      icon: Globe,           href: "/funnels" },
      { label: "Short Links",  icon: Link2,           href: "/short-links" },
      { label: "Chat",         icon: MessageSquare,   href: "/chat" },
      { label: "Sequences",    icon: Mail,            href: "/sequences" },
      { label: "Meetings",     icon: Calendar,        href: "/meetings" },
    ],
  },
  {
    label: "CRM",
    items: [
      { label: "Deals",        icon: Briefcase,  href: "/crm/deals" },
      { label: "Accounts",     icon: Building2,  href: "/crm/accounts" },
      { label: "Activities",   icon: Activity,   href: "/crm/activities" },
      { label: "Tasks",        icon: CheckSquare, href: "/crm/tasks" },
      { label: "Segments",     icon: Users2,     href: "/crm/segments" },
    ],
  },
  {
    label: "Settings",
    defaultCollapsed: true,
    items: [
      { label: "General",       icon: Settings,  href: "/settings" },
      { label: "Team Members",  icon: UserCog,   href: "/settings/team" },
      { label: "Custom Fields", icon: Layers,    href: "/settings/custom-fields" },
      { label: "Backups",       icon: DatabaseBackup, href: "/settings/backups" },
      { label: "Agents",        icon: Cpu,       href: "/settings/agents" },
    ],
  },
];

const platformItems: NavItem[] = [
  { label: "Platform home", icon: Shield,        href: "/platform" },
  { label: "Tenants",       icon: Building2,     href: "/platform/tenants" },
  { label: "Integrations",  icon: Settings,      href: "/platform/providers" },
  { label: "Usage",         icon: LayoutDashboard, href: "/platform/usage" },
  { label: "Security",      icon: Shield,        href: "/platform/security" },
];

// ── NavLink ────────────────────────────────────────────────────────────────────

function NavLink({ item, orgSlug, isPlatform }: {
  item: NavItem;
  orgSlug: string;
  isPlatform?: boolean;
}) {
  const pathname = usePathname();
  const href = isPlatform ? item.href : `/${orgSlug}${item.href}`;
  const isRoot = item.href === "/dashboard" || item.href === "/platform";
  const active = isRoot ? pathname === href : pathname?.startsWith(href);
  const Icon = item.icon;

  return (
    <Link
      href={href}
      className={cn(
        "group flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 text-sm font-medium",
        active
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25 font-semibold"
          : "text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/8"
      )}
    >
      <Icon className={cn(
        "h-4 w-4 shrink-0 transition-transform duration-200",
        !active && "group-hover:scale-110"
      )} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

// ── Collapsible group ──────────────────────────────────────────────────────────

function NavGroupSection({ group, orgSlug, initialOpen }: {
  group: NavGroup;
  orgSlug: string;
  initialOpen: boolean;
}) {
  const [open, setOpen] = useState(initialOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between px-3 mb-1 py-0.5 group/header"
        aria-expanded={open}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/35 group-hover/header:text-sidebar-foreground/55 transition-colors">
          {group.label}
        </span>
        <ChevronDown className={cn(
          "h-3 w-3 text-sidebar-foreground/30 transition-all duration-200 group-hover/header:text-sidebar-foreground/50",
          open && "rotate-180"
        )} />
      </button>
      {open && (
        <div className="space-y-0.5">
          {group.items.map((item) => (
            <NavLink key={item.href} item={item} orgSlug={orgSlug} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── AppSidebar ─────────────────────────────────────────────────────────────────

export function AppSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const orgSlug = params?.orgSlug as string;
  const brand = useBrand();
  const { user } = useAuthStore();
  const logout = useAuthStore((s) => s.logout);
  const { theme, setTheme } = useTheme();

  const isPlatformOwner = user?.isPlatformOwner;

  function isGroupInitiallyOpen(group: NavGroup): boolean {
    if (!group.defaultCollapsed) return true;
    return group.items.some((item) => {
      const href = `/${orgSlug}${item.href}`;
      return item.href === "/dashboard" ? pathname === href : pathname?.startsWith(href);
    });
  }

  const displayName = user?.fullName || user?.email?.split("@")[0] || orgSlug;
  const displayInitial = displayName?.[0]?.toUpperCase() ?? "M";

  return (
    <Sidebar>
      {/* Header — tenant branding */}
      <SidebarHeader className="border-b border-sidebar-border shrink-0 overflow-hidden flex items-center justify-center" style={{ height: "72px" }}>
        {brand.logoUrl ? (
          <img
            src={brand.logoUrl}
            alt={brand.name}
            className="max-h-full w-auto object-contain px-4"
          />
        ) : (
          <div className="flex items-center gap-3 h-full px-4 w-full">
            <div
              className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center shadow-lg font-bold text-sm text-white"
              style={{ backgroundColor: "var(--brand-primary, hsl(var(--primary)))" }}
            >
              {(brand.name || "MF").slice(0, 2).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-sidebar-foreground truncate">{brand.name || "MarketFlow"}</p>
              <p className="text-[10px] text-sidebar-foreground/50">{orgSlug}</p>
            </div>
          </div>
        )}
      </SidebarHeader>

      {/* Nav groups */}
      <SidebarContent>
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-5 scrollbar-hide">
          {navGroups.map((group) => (
            <NavGroupSection
              key={group.label}
              group={group}
              orgSlug={orgSlug}
              initialOpen={isGroupInitiallyOpen(group)}
            />
          ))}

          {isPlatformOwner && (
            <div>
              <p className="px-3 mb-1 py-0.5 text-[10px] font-bold uppercase tracking-[0.15em] text-sidebar-foreground/35">
                Platform console
              </p>
              <div className="space-y-0.5">
                {platformItems.map((item) => (
                  <NavLink key={item.href} item={item} orgSlug={orgSlug} isPlatform />
                ))}
              </div>
            </div>
          )}
        </nav>
      </SidebarContent>

      {/* Footer — user info + theme toggle */}
      <SidebarFooter className="border-t border-sidebar-border p-3 space-y-2">
        <button
          type="button"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-foreground/8 transition-all duration-200"
        >
          {theme === "dark"
            ? <Sun className="h-4 w-4 shrink-0" />
            : <Moon className="h-4 w-4 shrink-0" />
          }
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </button>

        <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-sidebar-foreground/5">
          <div
            className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
            style={{
              backgroundColor: "color-mix(in srgb, var(--brand-primary, hsl(var(--primary))) 20%, transparent)",
              color: "var(--brand-primary, hsl(var(--primary)))",
            }}
          >
            {displayInitial}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-sidebar-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-sidebar-foreground/50 mt-0.5 truncate">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="h-7 w-7 rounded-lg flex items-center justify-center text-sidebar-foreground/40 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
