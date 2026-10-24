"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ChevronRight, CreditCard, Palette, PlugZap, Quote, Rocket, ScrollText, Settings, SlidersHorizontal, UserCircle, UsersRound, Workflow,
  type LucideIcon,
} from "lucide-react";
import { PageHeader, ToneBadge } from "@/components/ui-kit";
import { useChecklist } from "@/hooks/use-onboarding";

type Tile = { href: string; title: string; desc: string; icon: LucideIcon };

const GROUPS: { title: string; tiles: Tile[] }[] = [
  {
    title: "Your business",
    tiles: [
      { href: "/onboarding", title: "Setup guide", desc: "The steps that get MarketFlow working from your own data.", icon: Rocket },
      { href: "/settings/profile", title: "Public profile", desc: "Your public page: story, products, contacts and booking.", icon: UserCircle },
      { href: "/settings/marketing-context", title: "Brand context", desc: "Who you sell to, what you sell and how you sound.", icon: Palette },
      { href: "/settings/testimonials", title: "Testimonials", desc: "Customer stories shown on your public page.", icon: Quote },
    ],
  },
  {
    title: "People and tools",
    tiles: [
      { href: "/settings/team", title: "Team members", desc: "Who can sign in to MarketFlow and what they can do.", icon: UsersRound },
      { href: "/settings/agents", title: "Agents", desc: "Your marketing team members and their instructions.", icon: Workflow },
      { href: "/settings/integrations", title: "Integrations", desc: "Your Facebook page, ad accounts and calendar.", icon: PlugZap },
      { href: "/settings/custom-fields", title: "Custom fields", desc: "Extra details you keep on leads and contacts.", icon: SlidersHorizontal },
    ],
  },
  {
    title: "Account",
    tiles: [
      { href: "/settings/billing", title: "Billing", desc: "Your plan, usage and prepaid credits.", icon: CreditCard },
      { href: "/settings/audit", title: "Activity log", desc: "Who changed what, and when.", icon: ScrollText },
    ],
  },
];

export default function SettingsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const checklist = useChecklist();
  const c = checklist.data;

  return (
    <div className="space-y-8">
      <PageHeader icon={<Settings />} title="Settings" description="Everything about your business in MarketFlow. Platform-wide keys are managed by Codevertex and never shown here." />
      {GROUPS.map((g) => (
        <section key={g.title} aria-labelledby={`grp-${g.title}`}>
          <h2 id={`grp-${g.title}`} className="mb-3 font-display text-base font-semibold">{g.title}</h2>
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {g.tiles.map((t) => (
              <li key={t.href}>
                <Link href={`/${orgSlug}${t.href}`} className="glass group flex h-full items-start gap-3 rounded-[1.25rem] p-4 transition-colors hover:border-primary/40 active:scale-[0.99]">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><t.icon className="size-5" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2 font-medium">
                      {t.title}
                      {t.href === "/onboarding" && c && (c.complete ? <ToneBadge tone="success">Done</ToneBadge> : <ToneBadge tone="primary">{c.done} of {c.total}</ToneBadge>)}
                    </span>
                    <span className="mt-0.5 block text-sm text-muted-foreground">{t.desc}</span>
                  </span>
                  <ChevronRight className="mt-2 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
