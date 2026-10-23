"use client";

import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { SidebarTrigger } from "@/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LogOut, User, Globe, Bell, ExternalLink, Settings, Shield, CalendarClock, ListTodo, Lightbulb, X } from "lucide-react";
import { TenantSwitcher } from "@/components/layout/tenant-switcher";
import { OutletFilter } from "@/components/layout/outlet-filter";
import { useAttention, useDismissSuggestion } from "@/hooks/use-attention";
import { publicProfileUrl } from "@/lib/urls";
import { useVisibleServices, serviceTagsFromAccessToken, AppSwitcherGrid, AppSwitcherTrigger, type ServiceKey } from "@bengo-hub/shared-ui-lib/app-switcher";

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

const timeFmt = new Intl.DateTimeFormat("en-KE", { weekday: "short", hour: "numeric", minute: "2-digit" });

function AttentionBell({ orgSlug }: { orgSlug?: string }) {
  const { data, isLoading } = useAttention(!!orgSlug);
  const dismiss = useDismissSuggestion();
  const tasks = data?.tasks ?? [];
  const meetings = data?.meetings ?? [];
  const suggestions = data?.suggestions ?? [];
  const count = tasks.length + meetings.length + suggestions.length;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={count ? `${count} items need attention` : "Nothing needs attention"}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute right-1.5 top-1.5 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-4 text-primary-foreground tabular">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[22rem] max-w-[calc(100vw-1.5rem)] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <p className="text-sm font-semibold">Needs attention</p>
          <span className="text-xs text-muted-foreground">{isLoading ? "Checking..." : `${count} item${count === 1 ? "" : "s"}`}</span>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {!isLoading && count === 0 && (
            <div className="px-4 py-8 text-center">
              <Bell className="mx-auto mb-2 h-7 w-7 text-muted-foreground/40" />
              <p className="text-sm font-medium">You are all caught up</p>
              <p className="mt-1 text-xs text-muted-foreground">Overdue tasks, today&apos;s meetings and agent suggestions show here.</p>
            </div>
          )}
          {meetings.map((m) => (
            <Link
              key={m.id}
              href={`/${orgSlug}/meetings`}
              className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-accent"
            >
              <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-info" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">
                  {m.meeting_type.replace(/_/g, " ")}
                  {m.attendee_name ? ` with ${m.attendee_name}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">{timeFmt.format(new Date(m.scheduled_at))}</p>
              </div>
            </Link>
          ))}
          {tasks.map((t) => (
            <Link
              key={t.id}
              href={`/${orgSlug}/crm/tasks`}
              className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-accent"
            >
              <ListTodo className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{t.title}</p>
                <p className="text-xs text-destructive">
                  Overdue{t.due_at ? ` since ${timeFmt.format(new Date(t.due_at))}` : ""}
                </p>
              </div>
            </Link>
          ))}
          {suggestions.map((s) => (
            <div key={s.id} className="flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-accent">
              <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{s.subject || "Suggestion"}</p>
                {s.body && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{s.body}</p>}
              </div>
              <button
                type="button"
                aria-label="Dismiss suggestion"
                onClick={() => dismiss.mutate(s.id)}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-background hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function AppHeader() {
  const { user, logout, session } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const onPlatformRoute = pathname?.startsWith("/platform") ?? false;

  const initials = user?.fullName
    ? user.fullName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : user?.email?.slice(0, 2).toUpperCase() || "MF";

  const tenantSlug = orgSlug || user?.tenantSlug;
  const publicUrl = tenantSlug ? publicProfileUrl(tenantSlug) : null;

  // Every real service is shown; each one enforces its own RBAC and plan on arrival. A service
  // outside the plan stays visible as "Not in your plan" with a link to the plans page.
  const services = useVisibleServices({
    orgSlug,
    urls: SERVICE_URLS,
    canManageLinks: true,
    activeServiceTags: serviceTagsFromAccessToken(session?.accessToken),
    upgradeUrl: SERVICE_URLS.subscriptions ? `${SERVICE_URLS.subscriptions}/${orgSlug}` : null,
  });

  return (
    <header className="sticky top-0 z-30 px-3 pt-[calc(env(safe-area-inset-top)+0.5rem)] sm:px-4 lg:px-6">
      <div className="glass-strong flex h-14 items-center gap-2 rounded-2xl px-2 sm:gap-3 sm:px-3">
        <SidebarTrigger className="h-10 w-10 rounded-xl" />

        {/* Cross-tenant selector, confined to /platform routes (self-gated). */}
        {user?.isPlatformOwner && <TenantSwitcher />}

        {user?.isPlatformOwner && !onPlatformRoute && (
          <button
            type="button"
            onClick={() => router.push("/platform")}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-border bg-background/60 px-3 text-sm hover:bg-accent"
          >
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="hidden sm:inline">Platform console</span>
          </button>
        )}

        <OutletFilter />

        <div className="flex-1" />

        {publicUrl && !onPlatformRoute && (
          <a
            href={publicUrl}
            target="_blank"
            rel="noreferrer"
            className="hidden h-10 items-center gap-1.5 rounded-xl border border-border bg-background/60 px-3 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground md:inline-flex"
          >
            <Globe className="h-4 w-4" />
            Public page
            <ExternalLink className="h-3 w-3" />
          </a>
        )}

        {!onPlatformRoute && <AttentionBell orgSlug={orgSlug} />}

        <AppSwitcherTrigger services={services} />

        <DropdownMenu>
          <DropdownMenuTrigger
            aria-label="Account menu"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full outline-none"
          >
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/12 font-semibold text-primary">{initials}</AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80 max-h-[70vh] overflow-y-auto">
            <div className="flex flex-col gap-0.5 p-2">
              <p className="text-sm font-medium">{user?.fullName || user?.email}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
              {user?.isPlatformOwner && <p className="mt-1 text-xs font-medium text-primary">Platform owner</p>}
            </div>
            <DropdownMenuSeparator />
            {orgSlug && (
              <>
                <DropdownMenuItem onClick={() => router.push(`/${orgSlug}/settings/profile`)}>
                  <User className="mr-2 h-4 w-4" />
                  Public profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/${orgSlug}/settings`)}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
              </>
            )}
            {publicUrl && (
              <DropdownMenuItem onClick={() => window.open(publicUrl, "_blank")}>
                <Globe className="mr-2 h-4 w-4" />
                View public page
              </DropdownMenuItem>
            )}
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
      </div>
    </header>
  );
}
