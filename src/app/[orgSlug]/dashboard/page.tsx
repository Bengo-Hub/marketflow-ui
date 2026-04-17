"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { STALE_TIMES } from "@/app/providers";
import { Eye, MousePointerClick, MessageCircle, Calendar, Phone } from "lucide-react";

type Dashboard = {
  leads: { total: number; this_week: number; delta_percent: number; converted: number; conversion_rate: number };
  chat_sessions: { this_week: number };
  campaigns: { active: number };
  meetings: { upcoming_week: number };
  nurture: { active_enrollments: number };
  generated_at: string;
};

type ProfileAnalytics = {
  page_views: number;
  cta_clicks: number;
  whatsapp_clicks: number;
  chat_opens: number;
  book_clicks: number;
};

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<Dashboard>({
    queryKey: ["dashboard"],
    queryFn: async () => {
      const r = await apiClient.get<Dashboard>(`/api/v1/analytics/dashboard`);
      return r.data;
    },
    staleTime: STALE_TIMES.OPERATIONAL,
    refetchInterval: 60_000,
  });

  const { data: profileData, isLoading: profileLoading } = useQuery<ProfileAnalytics>({
    queryKey: ["profile-analytics"],
    queryFn: async () => {
      const r = await apiClient.get<{ data: ProfileAnalytics }>(`/api/v1/analytics/profile`);
      return r.data.data ?? r.data;
    },
    staleTime: STALE_TIMES.MODERATE,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Your marketing pipeline at a glance. Updates every 60 seconds.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          Failed to load: {(error as Error).message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Total leads"
          value={data?.leads.total}
          sub={
            data
              ? `${data.leads.this_week} this week ${formatDelta(data.leads.delta_percent)}`
              : undefined
          }
          loading={isLoading}
        />
        <Metric
          label="Conversion rate"
          value={data ? `${data.leads.conversion_rate.toFixed(1)}%` : undefined}
          sub={data ? `${data.leads.converted} converted` : undefined}
          loading={isLoading}
        />
        <Metric
          label="Chat sessions"
          value={data?.chat_sessions.this_week}
          sub="this week"
          loading={isLoading}
        />
        <Metric
          label="Active campaigns"
          value={data?.campaigns.active}
          loading={isLoading}
        />
        <Metric
          label="Upcoming meetings"
          value={data?.meetings.upcoming_week}
          sub="next 7 days"
          loading={isLoading}
        />
        <Metric
          label="Active nurture"
          value={data?.nurture.active_enrollments}
          sub="enrollments in progress"
          loading={isLoading}
        />
      </div>

      {/* Profile Visitor Analytics */}
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Profile Visitor Analytics</h2>
          <p className="text-xs text-muted-foreground">Last 30 days</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <VisitorStat
            icon={<Eye className="h-4 w-4 text-blue-500" />}
            label="Page Views"
            value={profileData?.page_views}
            loading={profileLoading}
          />
          <VisitorStat
            icon={<MousePointerClick className="h-4 w-4 text-amber-500" />}
            label="CTA Clicks"
            value={profileData?.cta_clicks}
            loading={profileLoading}
          />
          <VisitorStat
            icon={<Phone className="h-4 w-4 text-green-500" />}
            label="WhatsApp Clicks"
            value={profileData?.whatsapp_clicks}
            loading={profileLoading}
          />
          <VisitorStat
            icon={<MessageCircle className="h-4 w-4 text-purple-500" />}
            label="Chat Opens"
            value={profileData?.chat_opens}
            loading={profileLoading}
          />
          <VisitorStat
            icon={<Calendar className="h-4 w-4 text-rose-500" />}
            label="Book Clicks"
            value={profileData?.book_clicks}
            loading={profileLoading}
          />
        </div>
      </section>

      {data && (
        <p className="text-xs text-muted-foreground">
          Generated at {new Date(data.generated_at).toLocaleString()}
        </p>
      )}
    </div>
  );
}

function Metric({
  label,
  value,
  sub,
  loading,
}: {
  label: string;
  value?: number | string;
  sub?: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-medium uppercase text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-3xl font-semibold tracking-tight">{value ?? "--"}</div>
        )}
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function VisitorStat({
  icon,
  label,
  value,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value?: number;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium uppercase text-muted-foreground">
          {icon}
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-semibold tracking-tight">
            {value != null ? value.toLocaleString() : "--"}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatDelta(pct: number): string {
  if (!isFinite(pct) || pct === 0) return "";
  const sign = pct > 0 ? "▲" : "▼";
  return `(${sign} ${Math.abs(pct).toFixed(0)}%)`;
}
