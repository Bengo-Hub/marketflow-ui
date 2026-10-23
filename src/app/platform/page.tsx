import Link from "next/link";
import { Building2, Cog, Gauge, KeyRound, Receipt, Shield } from "lucide-react";
import { PageHeader } from "@/components/ui-kit";

const SECTIONS = [
  { title: "Tenants", href: "/platform/tenants", icon: Building2, desc: "Every tenant using MarketFlow, with plan and status. Open one to act as that tenant." },
  { title: "Providers", href: "/platform/providers", icon: KeyRound, desc: "AI, advertising, calendar and messaging providers shared by all tenants." },
  { title: "Billing", href: "/platform/billing", icon: Receipt, desc: "Plans, service charges and plan overrides per tenant." },
  { title: "Usage", href: "/platform/usage", icon: Gauge, desc: "Leads, chats, campaigns and meetings across the platform this week." },
  { title: "Service config", href: "/platform/service-config", icon: Cog, desc: "Platform defaults and per-tenant overrides for service settings." },
  { title: "Security", href: "/platform/security", icon: Shield, desc: "Encryption key status and rotation, and the admin audit trail." },
];

export default function PlatformOverviewPage() {
  return (
    <div className="space-y-6">
      <PageHeader title="Platform console" description="Shared configuration, tenants and security for every MarketFlow workspace." icon={<Shield />} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {SECTIONS.map(({ title, href, icon: Icon, desc }) => (
          <Link key={href} href={href} className="glass group flex gap-4 rounded-[1.25rem] p-5 transition-transform hover:-translate-y-0.5 motion-reduce:transform-none">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Icon className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block font-display text-base font-semibold group-hover:text-primary">{title}</span>
              <span className="mt-1 block text-sm text-muted-foreground">{desc}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
