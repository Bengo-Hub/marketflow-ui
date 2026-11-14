"use client";

import { Switch } from "@/components/ui/switch";
import { GlassPanel } from "@/components/ui-kit";
import { useCanApprove } from "@/hooks/use-creative";
import { useTenantProfile, useUpdateTenantProfile } from "@/hooks/use-tenant-profile";
import { AI_LABEL_EXPLANATION, aiLabelOn, aiLabelPatch } from "@/lib/ai-label";

/**
 * The owner's AI label switch (owner 2026-11-14). It saves on its own, through the profile, apart
 * from the rest of the brand page. Owners and admins change it; members see it read-only.
 */
export function AILabelPanel() {
  const profile = useTenantProfile();
  const save = useUpdateTenantProfile();
  const canChange = !!useCanApprove();
  const on = aiLabelOn(profile.data?.metadata);
  return (
    <GlassPanel title="AI label">
      <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-background/60 p-4">
        <div>
          <p className="text-sm font-medium">Show an AI-generated label</p>
          <p className="text-xs text-muted-foreground">{AI_LABEL_EXPLANATION}</p>
          {!canChange && <p className="mt-1 text-xs text-muted-foreground">Only the account owner or an admin can change this.</p>}
        </div>
        <Switch
          checked={on}
          disabled={!canChange || !profile.data || save.isPending}
          onCheckedChange={(next) => save.mutate({ metadata: aiLabelPatch(next) })}
          aria-label="Show an AI-generated label"
        />
      </div>
    </GlassPanel>
  );
}
