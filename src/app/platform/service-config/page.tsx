"use client";

import { useState } from "react";
import { Cog, Eye, EyeOff, Pencil, Plus } from "lucide-react";
import { SearchableCombobox } from "@bengo-hub/shared-ui-lib/combobox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CapsuleTabs, EmptyState, ErrorState, Field, PageHeader, ToneBadge } from "@/components/ui-kit";
import { useAdminTenants, useServiceConfig, useUpsertServiceConfig } from "@/hooks/use-admin";
import type { ServiceConfig } from "@/lib/api/admin";

type Scope = "platform" | "tenant";
type Draft = { key: string; value: string; description: string; isNew: boolean };

const KEY_RE = /^[a-z0-9_.-]{2,100}$/;

/** Platform defaults and per-tenant overrides for marketflow-api service settings (/admin/service-config). */
export default function ServiceConfigPage() {
  const [scope, setScope] = useState<Scope>("platform");
  const [tenantId, setTenantId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [draft, setDraft] = useState<Draft | null>(null);
  const tenants = useAdminTenants();
  const activeTenant = scope === "tenant" ? tenantId : null;
  const list = useServiceConfig(activeTenant);
  const upsert = useUpsertServiceConfig(activeTenant);
  const waitingForTenant = scope === "tenant" && !tenantId;

  const rows = waitingForTenant ? [] : (list.data ?? []);
  const keyError = draft?.isNew && draft.key && !KEY_RE.test(draft.key) ? "Lowercase letters, digits, dot, dash or underscore." : null;

  const save = () => {
    if (!draft || !draft.key || keyError) return;
    upsert.mutate(
      { key: draft.key, value: draft.value, description: draft.description || undefined },
      { onSuccess: () => setDraft(null) },
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Cog />}
        title="Service config"
        description="Settings marketflow-api reads at run time. A tenant override wins over the platform default."
        actions={
          <Button disabled={waitingForTenant} onClick={() => setDraft({ key: "", value: "", description: "", isNew: true })}>
            <Plus />
            Add setting
          </Button>
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <CapsuleTabs<Scope>
          label="Scope"
          value={scope}
          onChange={setScope}
          options={[
            { value: "platform", label: "Platform defaults" },
            { value: "tenant", label: "Tenant overrides" },
          ]}
        />
        {scope === "tenant" && (
          <div className="w-full max-w-sm">
            <SearchableCombobox
              options={(tenants.data ?? []).map((t) => ({ value: t.id, label: `${t.name} (${t.slug})` }))}
              value={tenantId ?? ""}
              onChange={(v: string) => setTenantId(v || null)}
              placeholder={tenants.isLoading ? "Loading tenants..." : "Choose a tenant"}
            />
          </div>
        )}
      </div>

      <div className="glass rounded-[1.25rem] p-2 sm:p-4">
        {list.isError && <ErrorState onRetry={() => void list.refetch()} />}
        {waitingForTenant && <EmptyState icon={<Cog />} title="Choose a tenant" description="Pick a tenant to see and change its overrides." />}
        {!waitingForTenant && list.isLoading && (
          <div className="space-y-2 p-2" aria-busy>
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
            ))}
          </div>
        )}
        {!waitingForTenant && !list.isLoading && !list.isError && rows.length === 0 && (
          <EmptyState icon={<Cog />} title="No settings yet" description="Add a setting to override the service's built-in default." />
        )}
        {rows.length > 0 && (
          <ul className="divide-y divide-border">
            {rows.map((c: ServiceConfig) => {
              const show = !c.is_secret || revealed[c.id];
              return (
                <li key={c.id} className="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="text-sm font-semibold">{c.config_key}</code>
                      {c.is_secret && <ToneBadge tone="warning">Secret</ToneBadge>}
                      {c.is_override && <ToneBadge tone="primary">Override</ToneBadge>}
                    </div>
                    {c.description && <p className="mt-0.5 text-xs text-muted-foreground">{c.description}</p>}
                  </div>
                  <code className="max-w-full truncate rounded-lg bg-muted px-2.5 py-1 text-xs sm:max-w-[22rem]">
                    {show ? c.config_value || "(empty)" : "••••••••"}
                  </code>
                  <div className="flex gap-1">
                    {c.is_secret && (
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        aria-label={show ? "Hide value" : "Show value"}
                        onClick={() => setRevealed((r) => ({ ...r, [c.id]: !r[c.id] }))}
                      >
                        {show ? <EyeOff /> : <Eye />}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Edit ${c.config_key}`}
                      onClick={() => setDraft({ key: c.config_key, value: c.config_value, description: c.description ?? "", isNew: false })}
                    >
                      <Pencil />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Dialog open={!!draft} onOpenChange={(o) => !o && setDraft(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{draft?.isNew ? "Add setting" : `Edit ${draft?.key}`}</DialogTitle>
          </DialogHeader>
          {draft && (
            <div className="space-y-4">
              {draft.isNew && (
                <Field label="Key" required error={keyError} htmlFor="sc-key">
                  <Input id="sc-key" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value.trim() })} placeholder="e.g. chat.max_daily_sessions" />
                </Field>
              )}
              <Field label="Value" htmlFor="sc-value">
                <Textarea id="sc-value" rows={3} value={draft.value} onChange={(e) => setDraft({ ...draft, value: e.target.value })} />
              </Field>
              <Field label="Description" htmlFor="sc-desc">
                <Input id="sc-desc" value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
              </Field>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDraft(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={!draft?.key || !!keyError || upsert.isPending}>
              {upsert.isPending ? "Saving..." : "Save setting"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
