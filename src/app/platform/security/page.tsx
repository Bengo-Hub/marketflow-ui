"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";

type AuditEntry = {
  id: string;
  event: string;
  scope: string;
  actor?: string;
  subject_type?: string;
  subject_id?: string;
  payload?: Record<string, unknown>;
  occurred_at: string;
};

export default function PlatformSecurityPage() {
  const [filter, setFilter] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: ["platform-audit", filter],
    queryFn: async () => {
      const p = new URLSearchParams({ limit: "100" });
      if (filter) p.set("event", filter);
      const r = await apiClient.get<{ data: AuditEntry[] }>(`/api/v1/admin/audit?${p}`);
      return r.data;
    },
    refetchInterval: 30_000,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Security</h1>
        <p className="text-sm text-muted-foreground">
          Encryption status, encryption-key rotation, and the platform-scope audit trail.
        </p>
      </div>

      <Card>
        <CardContent className="space-y-2 p-6 text-sm">
          <h2 className="text-base font-medium">Encryption</h2>
          <p className="text-muted-foreground">
            ProviderSetting secrets are encrypted at rest with AES-256-GCM using the 32-byte key
            in <code className="rounded bg-muted px-1">MF_SECURITY_ENCRYPTION_KEY</code>. Key
            material is mounted from a Kubernetes Secret; rotation requires re-encrypting
            existing rows and restarting all consumers.
          </p>
        </CardContent>
      </Card>

      <div>
        <div className="mb-3 flex items-end justify-between">
          <h2 className="text-base font-medium">Audit trail</h2>
          <Input
            className="w-64"
            placeholder="Filter by event (e.g. admin.provider_updated)…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>When</TableHead>
                  <TableHead>Event</TableHead>
                  <TableHead>Actor</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Payload</TableHead>
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
                ) : !data?.data?.length ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                      No audit events yet. Provider updates and admin actions appear here.
                    </TableCell>
                  </TableRow>
                ) : (
                  data.data.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                        {new Date(e.occurred_at).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{e.event}</Badge>
                      </TableCell>
                      <TableCell className="text-xs">{e.actor ?? "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {e.subject_type ?? "—"}
                      </TableCell>
                      <TableCell className="max-w-md truncate font-mono text-xs text-muted-foreground">
                        {e.payload ? JSON.stringify(e.payload) : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
