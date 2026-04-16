"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

type Usage = {
  tenants: { total: number; active: number };
  leads: { total: number; this_week: number };
  chat_sessions: { this_week: number };
  campaigns: { active: number };
  meetings: { upcoming: number };
  nurture: { active_enrollments: number };
  leaderboard: {
    tenant_id: string;
    tenant_name: string;
    slug: string;
    leads_this_week: number;
  }[];
  generated_at: string;
};

export default function PlatformUsagePage() {
  const { data, isLoading, error } = useQuery<Usage>({
    queryKey: ["platform-usage"],
    queryFn: async () => {
      const r = await apiClient.get<Usage>(`/api/v1/admin/usage`);
      return r.data;
    },
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Platform usage</h1>
        <p className="text-sm text-muted-foreground">
          Aggregated metrics across every tenant on the platform. Refresh every 60s.
        </p>
      </div>

      {error && (
        <div className="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
          {(error as Error).message}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Metric label="Tenants" value={data?.tenants.total} sub={`${data?.tenants.active ?? 0} active`} loading={isLoading} />
        <Metric label="Leads (total)" value={data?.leads.total} sub={`${data?.leads.this_week ?? 0} this week`} loading={isLoading} />
        <Metric label="Chat sessions" value={data?.chat_sessions.this_week} sub="this week" loading={isLoading} />
        <Metric label="Active campaigns" value={data?.campaigns.active} loading={isLoading} />
        <Metric label="Upcoming meetings" value={data?.meetings.upcoming} loading={isLoading} />
        <Metric label="Active nurture" value={data?.nurture.active_enrollments} sub="enrollments" loading={isLoading} />
      </div>

      <div>
        <h2 className="mb-3 text-base font-medium">Top tenants by leads (this week)</h2>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead className="text-right">Leads</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    </TableRow>
                  ))
                ) : !data?.leaderboard?.length ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-6 text-center text-muted-foreground">
                      No lead activity this week.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.leaderboard.map((r) => (
                    <TableRow key={r.tenant_id}>
                      <TableCell className="font-medium">{r.tenant_name}</TableCell>
                      <TableCell className="font-mono text-xs">{r.slug}</TableCell>
                      <TableCell className="text-right">{r.leads_this_week}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

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
          <div className="text-3xl font-semibold tracking-tight">{value ?? "—"}</div>
        )}
        {sub && <div className="mt-1 text-xs text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}
