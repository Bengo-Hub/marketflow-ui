"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { KeyRound, RefreshCw, ShieldCheck } from "lucide-react";
import { AuditLog } from "@/components/audit/audit-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog, ErrorState, Field, GlassPanel, PageHeader, ToneBadge } from "@/components/ui-kit";
import { usePlatformAudit } from "@/hooks/use-admin";
import { adminApi } from "@/lib/api/admin";
import { apiErrorMessage } from "@/lib/api/errors";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

function EncryptionKeySection() {
  const qc = useQueryClient();
  const [customKey, setCustomKey] = useState("");
  const [confirming, setConfirming] = useState(false);
  const status = useQuery({ queryKey: ["admin", "encryption-key"], queryFn: adminApi.encryptionKey });

  const put = useMutation({
    mutationFn: adminApi.setEncryptionKey,
    onSuccess: (data, v) => {
      qc.setQueryData(["admin", "encryption-key"], data);
      toast.success(v.generate ? "New key generated and in use" : "Your key is now in use");
      setCustomKey("");
      setConfirming(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not change the key")),
  });

  const s = status.data;
  return (
    <GlassPanel title="Encryption key" description="Encrypts the provider secrets (AI, messaging, payments) stored in MarketFlow. The key itself is never shown.">
      {status.isLoading ? (
        <div className="h-16 animate-pulse rounded-xl bg-muted" />
      ) : status.isError ? (
        <ErrorState message={apiErrorMessage(status.error, "Could not load the key status.")} onRetry={() => void status.refetch()} />
      ) : s ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            {!s.configured ? (
              <ToneBadge tone="danger">Not set: new secrets are stored unencrypted</ToneBadge>
            ) : s.source === "db" ? (
              <ToneBadge tone="success">In use, kept in the database</ToneBadge>
            ) : (
              <ToneBadge tone="warning">In use from the environment</ToneBadge>
            )}
          </div>
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-1 text-sm">
            <dt className="text-muted-foreground">Fingerprint</dt>
            <dd className="font-mono">{s.key_fingerprint || "None"}</dd>
            <dt className="text-muted-foreground">Last changed</dt>
            <dd>{s.updated_at ? when.format(new Date(s.updated_at)) : "Never"}</dd>
          </dl>
          <p className="text-sm text-muted-foreground">
            Changing the key affects new secrets only. Existing ones stay readable, because older keys are still tried when decrypting.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setConfirming(true)} disabled={put.isPending}>
              {put.isPending ? <RefreshCw className="animate-spin" /> : <KeyRound />} Generate a new key
            </Button>
          </div>
          <details className="rounded-xl border border-border">
            <summary className="cursor-pointer px-3 py-2 text-sm font-medium">Use a key you already have</summary>
            <div className="border-t border-border p-3">
              <Field label="Base64-encoded 32-byte key" htmlFor="enc-key">
                <div className="flex gap-2">
                  <Input id="enc-key" value={customKey} onChange={(e) => setCustomKey(e.target.value)} className="font-mono" autoComplete="off" spellCheck={false} />
                  <Button variant="outline" disabled={put.isPending || !customKey.trim()} onClick={() => put.mutate({ key: customKey.trim() })}>Use this key</Button>
                </div>
              </Field>
            </div>
          </details>
        </div>
      ) : null}
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        variant="default"
        title="Generate a new encryption key?"
        description="New provider secrets will be encrypted with it. Secrets saved earlier stay readable."
        confirmLabel="Generate key"
        pending={put.isPending}
        onConfirm={() => put.mutate({ generate: true })}
      />
    </GlassPanel>
  );
}

export default function PlatformSecurityPage() {
  return (
    <div className="space-y-6">
      <PageHeader icon={<ShieldCheck />} title="Security" description="The key that encrypts provider secrets, and the platform audit trail." />
      <EncryptionKeySection />
      <section>
        <h2 className="mb-3 font-display text-base font-semibold">Audit trail</h2>
        <AuditLog useEntries={usePlatformAudit} storageKey="mf-platform-audit-columns" emptyText="Provider updates and other platform admin actions appear here." />
      </section>
    </div>
  );
}
