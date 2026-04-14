"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";

export default function SettingsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const sections = [
    { href: `/${orgSlug}/settings/profile`, title: "FBO profile", desc: "Your public /p/{slug} page — branding, bio, WhatsApp, testimonials." },
    { href: `/${orgSlug}/settings/team`, title: "Team", desc: "Invite users and manage tenant-level roles. Platform roles are not set here." },
    { href: `/${orgSlug}/settings/billing`, title: "Billing", desc: "Your current plan, invoices, and payment method." },
    { href: `/${orgSlug}/settings/integrations`, title: "Integrations", desc: "Your own Meta Page token and Cal.com embed URL. Platform-wide keys live in the platform console." },
  ];
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Tenant-scoped configuration. Shared platform secrets (Groq, Tavily, Meta App, SendGrid) are not editable here.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="h-full transition hover:border-[var(--brand-primary)] hover:shadow-sm">
              <CardContent className="p-4">
                <div className="text-base font-medium">{s.title}</div>
                <div className="mt-1 text-sm text-muted-foreground">{s.desc}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
