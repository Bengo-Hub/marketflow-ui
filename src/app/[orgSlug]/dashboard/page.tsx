"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  CalendarDays, Eye, LayoutDashboard, Megaphone, MessageSquare, MousePointerClick, Repeat, Target, Users, UsersRound,
} from "lucide-react";
import { WhatsAppIcon } from "@/components/public-profile/whatsapp-icon";
import { CapsuleTabs, EmptyState, ErrorState, GlassPanel, PageHeader, StatCard } from "@/components/ui-kit";
import { LeadTrendChart, SourceBars } from "@/components/dashboard/charts";
import { SetupCard } from "@/components/onboarding/setup-card";
import { useDashboard, useProfileMetrics } from "@/hooks/use-analytics";
import type { DashboardDays } from "@/lib/api/analytics";

const nf = new Intl.NumberFormat("en-KE");

function Delta({ pct }: { pct: number }) {
  if (!isFinite(pct) || Math.round(pct) === 0) return <span>No change on last week</span>;
  const up = pct > 0;
  return (
    <span className={up ? "text-success" : "text-destructive"}>
      {up ? "Up" : "Down"} {Math.abs(pct).toFixed(0)}% on last week
    </span>
  );
}

export default function DashboardPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [days, setDays] = useState<DashboardDays>(30);
  const dash = useDashboard(days);
  const profile = useProfileMetrics(days);
  const d = dash.data;
  const c = profile.data?.counts ?? {};
  const loading = dash.isLoading;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<LayoutDashboard />}
        title="Dashboard"
        description="Leads, conversations and follow-ups across your business."
        actions={
          <CapsuleTabs<`${DashboardDays}`>
            label="Period"
            value={`${days}`}
            onChange={(v) => setDays(Number(v) as DashboardDays)}
            options={[
              { value: "7", label: "7 days" },
              { value: "30", label: "30 days" },
              { value: "90", label: "90 days" },
            ]}
          />
        }
      />

      <SetupCard orgSlug={orgSlug} />

      {dash.isError && <ErrorState message="Could not load the dashboard." onRetry={() => void dash.refetch()} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="New leads this week" icon={<Users />} loading={loading} value={d ? nf.format(d.leads.this_week) : "0"} hint={d && <Delta pct={d.leads.delta_percent} />} />
        <StatCard label="Conversion rate" icon={<Target />} loading={loading} value={d ? `${d.leads.conversion_rate.toFixed(1)}%` : "0%"} hint={d && `${nf.format(d.leads.converted)} of ${nf.format(d.leads.total)} leads`} />
        <StatCard label="Chats this week" icon={<MessageSquare />} loading={loading} value={d ? nf.format(d.chat_sessions.this_week) : "0"} />
        <StatCard label="Meetings in the next 7 days" icon={<CalendarDays />} loading={loading} value={d ? nf.format(d.meetings.upcoming_week) : "0"} />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.6fr_1fr]">
        <GlassPanel title="New leads per day" description={d ? `${nf.format(d.leads.in_window)} in the last ${d.days} days` : undefined}>
          {loading ? (
            <div className="h-64 animate-pulse rounded-xl bg-muted" />
          ) : d && d.leads.in_window > 0 ? (
            <LeadTrendChart data={d.daily} />
          ) : (
            <EmptyState
              icon={<Users />}
              title="No new leads in this period"
              description="Share your public page or connect a lead form to start collecting leads."
              action={<Link href={`/${orgSlug}/settings/profile`} className="text-sm font-semibold text-primary hover:underline">Set up your public page</Link>}
            />
          )}
        </GlassPanel>
        <GlassPanel title="Where leads came from" description={d ? `Last ${d.days} days` : undefined}>
          {loading ? (
            <div className="h-48 animate-pulse rounded-xl bg-muted" />
          ) : d && d.by_source.length > 0 ? (
            <SourceBars data={d.by_source} />
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">Sources show here once leads arrive.</p>
          )}
        </GlassPanel>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Active campaigns" icon={<Megaphone />} loading={loading} value={d ? nf.format(d.campaigns.active) : "0"} />
        <StatCard label="Leads in follow-up sequences" icon={<Repeat />} loading={loading} value={d ? nf.format(d.nurture.active_enrollments) : "0"} />
      </div>

      <GlassPanel
        title="Your public page"
        description={`Visits and taps on /p/${orgSlug} in the last ${days} days`}
        actions={<Link href={`/${orgSlug}/settings/profile`} className="text-sm font-semibold text-primary hover:underline">Edit page</Link>}
      >
        {profile.isError ? (
          <ErrorState onRetry={() => void profile.refetch()} />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {[
              { label: "Visitors", value: profile.data?.unique_visitors, icon: <UsersRound className="h-4 w-4" /> },
              { label: "Page views", value: c.page_view, icon: <Eye className="h-4 w-4" /> },
              { label: "WhatsApp taps", value: c.whatsapp_click, icon: <WhatsAppIcon className="h-4 w-4" /> },
              { label: "Booking taps", value: c.book_click, icon: <CalendarDays className="h-4 w-4" /> },
              { label: "Product and other taps", value: (c.product_click ?? 0) + (c.cta_click ?? 0), icon: <MousePointerClick className="h-4 w-4" /> },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-border bg-background/50 p-4">
                <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <span className="text-primary">{s.icon}</span>
                  {s.label}
                </p>
                {profile.isLoading ? (
                  <div className="mt-2 h-7 w-12 animate-pulse rounded bg-muted" />
                ) : (
                  <p className="mt-1 font-display text-2xl font-semibold tabular">{nf.format(s.value ?? 0)}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
