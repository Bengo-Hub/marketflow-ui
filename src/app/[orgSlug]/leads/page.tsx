"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { STALE_TIMES } from "@/app/providers";

const statusColors: Record<string, string> = {
  new: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  contacted: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  qualified: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  converted: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  lost: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
};

export default function LeadsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);

  const { data, isLoading } = useQuery({
    queryKey: ["leads", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "20", offset: String(page * 20) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await apiClient.get(`/api/v1/leads?${params}`);
      return res.data;
    },
    staleTime: STALE_TIMES.OPERATIONAL,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Leads</h1>
          <p className="text-muted-foreground">{data?.total ?? 0} total leads</p>
        </div>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v ?? "all")}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="new">New</SelectItem>
            <SelectItem value="contacted">Contacted</SelectItem>
            <SelectItem value="qualified">Qualified</SelectItem>
            <SelectItem value="converted">Converted</SelectItem>
            <SelectItem value="lost">Lost</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 7 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No leads yet. They will appear here when captured from ads, funnels, or chat.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((lead: any) => (
                  <TableRow key={lead.id}>
                    <TableCell className="font-medium">
                      {lead.first_name || lead.last_name
                        ? `${lead.first_name || ""} ${lead.last_name || ""}`.trim()
                        : "—"}
                    </TableCell>
                    <TableCell>{lead.email || "—"}</TableCell>
                    <TableCell><Badge variant="outline">{lead.source}</Badge></TableCell>
                    <TableCell>{lead.lead_type}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[lead.status] || ""}`}>
                        {lead.status}
                      </span>
                    </TableCell>
                    <TableCell>{lead.score}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(lead.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
