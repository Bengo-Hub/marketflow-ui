"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { KeyRound, ShieldCheck, ShieldAlert, ShieldX, RefreshCw } from "lucide-react";

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

type EncryptionKeyStatus = {
  configured: boolean;
  source: "db" | "env";
  key_fingerprint: string;
  updated_at: string | null;
};

function EncryptionKeySection() {
  const qc = useQueryClient();
  const [customKey, setCustomKey] = useState("");

  const statusQ = useQuery<EncryptionKeyStatus>({
    queryKey: ["admin-encryption-key"],
    queryFn: async () => {
      const r = await apiClient.get<EncryptionKeyStatus>(`/api/v1/admin/encryption-key`);
      return r.data;
    },
  });

  const putKey = useMutation({
    mutationFn: async (body: { generate?: boolean; key?: string }) => {
      const r = await apiClient.put<EncryptionKeyStatus>(`/api/v1/admin/encryption-key`, body);
      return r.data;
    },
    onSuccess: (data) => {
      qc.setQueryData(["admin-encryption-key"], data);
      qc.invalidateQueries({ queryKey: ["admin-encryption-key"] });
    },
  });

  function handleGenerate() {
    putKey.mutate(
      { generate: true },
      {
        onSuccess: () => toast.success("New encryption key generated and activated"),
        onError: (e) => toast.error(`Failed to generate key: ${errMsg(e)}`),
      },
    );
  }

  function handleSaveCustom() {
    const key = customKey.trim();
    if (!key) {
      toast.error("Paste a base64-encoded 32-byte key first");
      return;
    }
    putKey.mutate(
      { key },
      {
        onSuccess: () => {
          toast.success("Encryption key activated");
          setCustomKey("");
        },
        onError: (e) => toast.error(errMsg(e)),
      },
    );
  }

  const status = statusQ.data;

  return (
    <Card>
      <CardContent className="space-y-5 p-6 text-sm">
        <div className="flex items-center gap-2">
          <KeyRound className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-base font-medium">Credential Encryption Key</h2>
        </div>

        {statusQ.isLoading ? (
          <Skeleton className="h-6 w-64" />
        ) : statusQ.isError ? (
          <p className="text-sm text-red-600">Failed to load key status: {errMsg(statusQ.error)}</p>
        ) : status ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              {!status.configured ? (
                <Badge className="gap-1 bg-red-600 text-white hover:bg-red-600">
                  <ShieldX className="h-3.5 w-3.5" />
                  Not configured — provider secrets stored unencrypted
                </Badge>
              ) : status.source === "db" ? (
                <Badge className="gap-1 bg-green-600 text-white hover:bg-green-600">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Configured (database)
                </Badge>
              ) : (
                <Badge className="gap-1 bg-amber-500 text-white hover:bg-amber-500">
                  <ShieldAlert className="h-3.5 w-3.5" />
                  Using environment fallback
                </Badge>
              )}
            </div>

            <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <dt>Fingerprint</dt>
              <dd className="font-mono text-foreground">{status.key_fingerprint || "—"}</dd>
              <dt>Last updated</dt>
              <dd className="text-foreground">
                {status.updated_at ? new Date(status.updated_at).toLocaleString() : "—"}
              </dd>
            </dl>
          </div>
        ) : null}

        <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
          New provider secrets are encrypted with the active key; existing secrets remain readable
          (decryption tries previous keys / plaintext). The raw key is never shown.
        </p>

        <div>
          <Button onClick={handleGenerate} disabled={putKey.isPending}>
            {putKey.isPending ? (
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <KeyRound className="mr-2 h-4 w-4" />
            )}
            Generate &amp; activate new key
          </Button>
        </div>

        <details className="rounded-md border">
          <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Advanced</summary>
          <div className="space-y-2 border-t px-3 py-3">
            <Label htmlFor="enc-key" className="text-xs">
              Activate an existing base64-encoded 32-byte key
            </Label>
            <div className="flex gap-2">
              <Input
                id="enc-key"
                value={customKey}
                onChange={(e) => setCustomKey(e.target.value)}
                placeholder="base64 32-byte key…"
                className="font-mono"
                autoComplete="off"
                spellCheck={false}
              />
              <Button
                variant="outline"
                onClick={handleSaveCustom}
                disabled={putKey.isPending}
              >
                Save
              </Button>
            </div>
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

/** Extract a useful message from an axios error, preferring backend 400 validation text. */
function errMsg(e: unknown): string {
  const anyErr = e as { response?: { data?: { error?: string; message?: string; detail?: string } }; message?: string };
  return (
    anyErr?.response?.data?.error ||
    anyErr?.response?.data?.message ||
    anyErr?.response?.data?.detail ||
    anyErr?.message ||
    "Unknown error"
  );
}

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
          Credential encryption-key management and the platform-scope audit trail.
        </p>
      </div>

      <EncryptionKeySection />

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
