"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const NAV = [
  { label: "Overview", href: "/platform" },
  { label: "Integrations", href: "/platform/providers" },
  { label: "Billing", href: "/platform/billing" },
  { label: "Tenants", href: "/platform/tenants" },
  { label: "Usage", href: "/platform/usage" },
  { label: "Security", href: "/platform/security" },
];

export function PlatformSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  return (
    <Sidebar>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Platform</SidebarGroupLabel>
          <SidebarMenu>
            {NAV.map((item) => {
              const isActive = pathname === item.href;
              return (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton isActive={isActive} onClick={() => router.push(item.href)}>
                    {item.label}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              );
            })}
          </SidebarMenu>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
