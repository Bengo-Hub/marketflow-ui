"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { LayoutDashboard, Megaphone, MessageSquare, Users } from "lucide-react";
import { MobileBottomNav, type MobileNavTab } from "@bengo-hub/shared-ui-lib/navigation";
import { useSidebar } from "@/components/ui/sidebar";

/** Phone and tablet navigation (below lg). "More" opens the full sidebar sheet. */
export function MobileNav() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const pathname = usePathname() ?? "";
  const { setOpenMobile } = useSidebar();
  const base = `/${orgSlug}`;
  const tab = (key: string, label: string, path: string, icon: MobileNavTab["icon"]): MobileNavTab => ({
    key,
    label,
    href: `${base}${path}`,
    icon,
    active: pathname === `${base}${path}` || pathname.startsWith(`${base}${path}/`),
  });
  const tabs = [
    tab("dashboard", "Home", "/dashboard", LayoutDashboard),
    tab("leads", "Leads", "/leads", Users),
    tab("chat", "Chat", "/chat", MessageSquare),
    tab("campaigns", "Campaigns", "/campaigns", Megaphone),
  ];
  return (
    <MobileBottomNav
      tabs={tabs}
      onOpenMore={() => setOpenMobile(true)}
      LinkComponent={Link}
      className="!bg-background/80"
    />
  );
}
