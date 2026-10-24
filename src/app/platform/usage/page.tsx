"use client";

import Link from "next/link";
import { Building2, CalendarDays, Gauge, Megaphone, MessageSquare, Repeat, Trophy, Users } from "lucide-react";
import type { DataTableColumn } from "@bengo-hub/shared-ui-lib/data-table";
import { EmptyState, ErrorState, ListTable, PageHeader, StatCard } from "@/components/ui-kit";
import { usePlatformUsage } from "@/hooks/use-admin";
import type { PlatformUsage } from "@/lib/api/admin";

const nf = new Intl.NumberFormat("en-KE");
type Row = PlatformUsage["leaderboard"][number];

export default function PlatformUsagePage() {
  const usage = usePlatformUsage();
  const d = usage.data;
  const loading = usage.isLoading;

  const columns: DataTableColumn<Row>[] = [
    {
      key: "tenant_name",
      header: "Business",
      primary: true,
      accessor: (r) => r.tenant_name,
      render: (r) => (
        <Link href={`/${r.slug}/dashboard`} className="font-medium hover:text-primary">
          {r.tenant_name || r.slug}
          <span className="block text-xs font-normal text-muted-foreground">{r.slug}</span>
        </Link>
      ),
    },
    { key: "leads_this_week", header: "Leads this week", align: "right", mobileAction: true, accessor: (r) => r.leads_this_week, render: (r) => <span className="font-semibold tabular">{nf.format(r.leads_this_week)}</span> },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Gauge />}
        title="Platform usage"
        description={d ? `Across every business. Updated ${new Date(d.generated_at).toLocaleTimeString("en-KE", { hour: "numeric", minute: "2-digit" })}, refreshed every minute.` : "Across every business, refreshed every minute."}
      />
      {usage.isError && <ErrorState message="Could not load platform usage." onRetry={() => void usage.refetch()} />}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="Businesses" icon={<Building2 />} loading={loading} value={d ? nf.format(d.tenants.total) : "0"} hint={d && `${nf.format(d.tenants.active)} active`} />
        <StatCard label="Leads" icon={<Users />} loading={loading} value={d ? nf.format(d.leads.total) : "0"} hint={d && `${nf.format(d.leads.this_week)} this week`} />
        <StatCard label="Chats this week" icon={<MessageSquare />} loading={loading} value={d ? nf.format(d.chat_sessions.this_week) : "0"} />
        <StatCard label="Active campaigns" icon={<Megaphone />} loading={loading} value={d ? nf.format(d.campaigns.active) : "0"} />
        <StatCard label="Upcoming meetings" icon={<CalendarDays />} loading={loading} value={d ? nf.format(d.meetings.upcoming) : "0"} />
        <StatCard label="In follow-up sequences" icon={<Repeat />} loading={loading} value={d ? nf.format(d.nurture.active_enrollments) : "0"} />
      </div>

      <div>
        <h2 className="mb-3 font-display text-base font-semibold">Most leads this week</h2>
        <ListTable<Row>
          columns={columns}
          rows={d?.leaderboard ?? []}
          rowKey={(r) => r.tenant_id}
          loading={loading}
          emptyState={<EmptyState icon={<Trophy />} title="No leads this week yet" description="Businesses with new leads in the last 7 days appear here." />}
        />
      </div>
    </div>
  );
}
