"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { STALE_TIMES } from "@/app/providers";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["contacts", search],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: "50" });
      if (search) params.set("search", search);
      const res = await apiClient.get(`/api/v1/contacts?${params}`);
      return res.data;
    },
    staleTime: STALE_TIMES.OPERATIONAL,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contacts</h1>
          <p className="text-muted-foreground">{data?.total ?? 0} total contacts</p>
        </div>
        <Input
          className="w-64"
          placeholder="Search by name, email, phone…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Lifecycle</TableHead>
                <TableHead>Last activity</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    {Array.from({ length: 5 }).map((_, j) => (
                      <TableCell key={j}><Skeleton className="h-4 w-24" /></TableCell>
                    ))}
                  </TableRow>
                ))
              ) : data?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No contacts yet. Contacts are created from leads on qualification or purchase.
                  </TableCell>
                </TableRow>
              ) : (
                data?.data?.map((c: Record<string, unknown>) => (
                  <TableRow key={c.id as string}>
                    <TableCell className="font-medium">
                      {`${(c.first_name as string) || ""} ${(c.last_name as string) || ""}`.trim() || "—"}
                    </TableCell>
                    <TableCell>{(c.email as string) || "—"}</TableCell>
                    <TableCell>{(c.phone as string) || "—"}</TableCell>
                    <TableCell>{(c.lifecycle_stage as string) || "—"}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.last_activity_at
                        ? new Date(c.last_activity_at as string).toLocaleDateString()
                        : "—"}
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
