"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserCheck, BookOpen, Link2 } from "lucide-react";
import { STALE_TIMES } from "@/app/providers";

export default function DashboardPage() {
  const { data: leads } = useQuery({
    queryKey: ["leads", "count"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/leads?limit=1");
      return res.data;
    },
    staleTime: STALE_TIMES.MODERATE,
  });

  const { data: contacts } = useQuery({
    queryKey: ["contacts", "count"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/contacts?limit=1");
      return res.data;
    },
    staleTime: STALE_TIMES.MODERATE,
  });

  const { data: kb } = useQuery({
    queryKey: ["knowledge", "count"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/knowledge/entries?limit=1");
      return res.data;
    },
    staleTime: STALE_TIMES.SEMI_STATIC,
  });

  const { data: links } = useQuery({
    queryKey: ["shortlinks", "count"],
    queryFn: async () => {
      const res = await apiClient.get("/api/v1/short-links?limit=1");
      return res.data;
    },
    staleTime: STALE_TIMES.SEMI_STATIC,
  });

  const stats = [
    { title: "Total Leads", value: leads?.total ?? "—", icon: Users, color: "text-blue-500" },
    { title: "Contacts", value: contacts?.total ?? "—", icon: UserCheck, color: "text-green-500" },
    { title: "KB Entries", value: kb?.total ?? "—", icon: BookOpen, color: "text-purple-500" },
    { title: "Short Links", value: links?.total ?? "—", icon: Link2, color: "text-orange-500" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Marketing automation overview</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
