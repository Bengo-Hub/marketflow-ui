"use client";

import { useParams, usePathname } from "next/navigation";
import Link from "next/link";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton,
  SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { useAuthStore } from "@/store/auth-store";
import { useBrand } from "@/contexts/BrandContext";
import {
  LayoutDashboard, Users, UserCheck, BookOpen, Link2, MessageSquare,
  Settings, Megaphone, Globe, Mail, Calendar, Sun, Moon, Shield, Building2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { title: "Leads", href: "/leads", icon: Users },
  { title: "Contacts", href: "/contacts", icon: UserCheck },
  { title: "Knowledge Base", href: "/knowledge", icon: BookOpen },
  { title: "Campaigns", href: "/campaigns", icon: Megaphone },
  { title: "Funnels", href: "/funnels", icon: Globe },
  { title: "Short Links", href: "/short-links", icon: Link2 },
  { title: "Chat", href: "/chat", icon: MessageSquare },
  { title: "Sequences", href: "/sequences", icon: Mail },
  { title: "Meetings", href: "/meetings", icon: Calendar },
];

const settingsItems = [
  { title: "Settings", href: "/settings", icon: Settings },
];

const platformItems = [
  { title: "Platform home", href: "/platform", icon: Shield },
  { title: "Tenants", href: "/platform/tenants", icon: Building2 },
  { title: "Integrations", href: "/platform/providers", icon: Settings },
  { title: "Usage", href: "/platform/usage", icon: LayoutDashboard },
  { title: "Security", href: "/platform/security", icon: Shield },
];

export function AppSidebar() {
  const params = useParams();
  const pathname = usePathname();
  const orgSlug = params?.orgSlug as string;
  const brand = useBrand();
  const { user } = useAuthStore();
  const { theme, setTheme } = useTheme();

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-md flex items-center justify-center text-white font-bold text-sm"
               style={{ backgroundColor: "var(--brand-primary)" }}>
            M
          </div>
          <div>
            <p className="font-semibold text-sm">{brand.name || "MarketFlow"}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Marketing</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const href = `/${orgSlug}${item.href}`;
                const isActive = pathname === href || pathname?.startsWith(href + "/");
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={isActive} onClick={() => window.location.href = href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>System</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {settingsItems.map((item) => {
                const href = `/${orgSlug}${item.href}`;
                const isActive = pathname === href;
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton isActive={isActive} onClick={() => window.location.href = href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {user?.isPlatformOwner && (
          <SidebarGroup>
            <SidebarGroupLabel>Platform console</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {platformItems.map((item) => {
                  const isActive = pathname === item.href;
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton isActive={isActive} onClick={() => window.location.href = item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="border-t p-3">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
