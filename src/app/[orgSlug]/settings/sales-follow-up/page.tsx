"use client";

import { useState } from "react";
import { Handshake, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ErrorState, Field, GlassPanel, PageHeader } from "@/components/ui-kit";
import { useTenantProfile, useUpdateTenantProfile } from "@/hooks/use-tenant-profile";
import type { TenantProfile } from "@/lib/api/tenant-profile";
import { parseHandoffAmount, salesSettingsFrom, salesSettingsPatch } from "@/lib/sales/follow-up-settings";

/** Sprint 23 L45: how the assistant follows up leads who reply on WhatsApp. */
export default function SalesFollowUpSettingsPage() {
  const { data, isLoading, error, refetch, dataUpdatedAt } = useTenantProfile();
  if (error) return <ErrorState message="Could not load your settings." onRetry={() => void refetch()} />;
  if (isLoading || !data) return <div className="glass mx-auto h-64 max-w-3xl animate-pulse rounded-[1.25rem]" aria-busy />;
  return <SalesFollowUpForm key={dataUpdatedAt} data={data} />;
}

function SalesFollowUpForm({ data }: { data: TenantProfile }) {
  const save = useUpdateTenantProfile();
  const initial = salesSettingsFrom(data.metadata);
  const [autoReply, setAutoReply] = useState(initial.autoReply);
  const [amount, setAmount] = useState(initial.handoffValue ? String(initial.handoffValue) : "");
  const parsed = parseHandoffAmount(amount);
  const amountError = parsed === undefined ? "Enter an amount such as 100000 or 100k, or leave it empty." : undefined;

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (parsed === undefined) return;
    save.mutate({ metadata: salesSettingsPatch({ autoReply, handoffValue: parsed }) });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6" noValidate>
      <PageHeader
        icon={<Handshake />}
        title="Sales follow-up"
        description="When a lead replies on WhatsApp after your first message, your assistant can answer them from your own number."
      />

      <GlassPanel title="Answers on WhatsApp">
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-background/60 p-4">
          <div>
            <p className="text-sm font-medium">Let the assistant answer leads</p>
            <p className="text-xs text-muted-foreground">
              It answers from your knowledge base and catalogue and can book a meeting. When it is off, replies still appear on
              each lead&apos;s timeline for you to answer.
            </p>
          </div>
          <Switch checked={autoReply} onCheckedChange={setAutoReply} aria-label="Let the assistant answer leads" />
        </div>
      </GlassPanel>

      <GlassPanel title="When you take over" description="A lead who asks for a person always comes to you, and the assistant stops answering them.">
        <Field
          label="Hand over at this budget (KES)"
          hint="A lead who mentions a budget at or above this amount comes straight to you. Leave it empty to hand over only when asked."
          error={amountError}
          htmlFor="sf-amount"
        >
          <Input id="sf-amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="For example: 100000" />
        </Field>
        <p className="mt-3 text-sm text-muted-foreground">You and your MarketFlow admins get an email with the lead&apos;s message and a link to the lead.</p>
      </GlassPanel>

      <div className="flex justify-end">
        <Button type="submit" disabled={save.isPending || parsed === undefined}>
          <Save className="h-4 w-4" />
          {save.isPending ? "Saving..." : "Save"}
        </Button>
      </div>
    </form>
  );
}
