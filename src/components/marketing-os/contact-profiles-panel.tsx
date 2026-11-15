"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { GlassPanel } from "@/components/ui-kit";
import { apiError, marketingOsApi, type OSSettings } from "@/lib/api/marketing-os";

/**
 * The contact enricher's two switches (Sprint 10). Profiles come from records the business
 * already holds; the website lookup reads only the home page of a company account the business
 * entered, never anything about the person. Neither costs credits.
 */
export function ContactProfilesPanel({ settings, loading, orgSlug }: { settings?: OSSettings; loading: boolean; orgSlug: string }) {
  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (s: Partial<OSSettings>) => marketingOsApi.saveSettings(s),
    onSuccess: (saved) => {
      qc.setQueryData(["os-settings", orgSlug], saved);
      toast.success("Contact profile settings saved");
    },
    onError: (e) => toast.error(apiError(e, "Could not change the contact profile settings")),
  });
  const on = settings?.contact_enrichment ?? true;
  const web = on && (settings?.contact_enrichment_web ?? false);
  const busy = loading || save.isPending;

  return (
    <GlassPanel title="Contact profiles">
      <div className="space-y-3">
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-background/60 p-4">
          <div>
            <p className="text-sm font-medium">Fill in contact profiles</p>
            <p className="text-xs text-muted-foreground">
              Each contact gets a short profile from your own records: how they found you, their orders and payments, open deals and the company you linked them to. It updates when a contact is added or changed and once a week after that. Nobody is looked up on the internet, and it uses no AI credits.
            </p>
          </div>
          <Switch checked={on} disabled={busy} onCheckedChange={(v: boolean) => save.mutate({ contact_enrichment: v })} aria-label="Fill in contact profiles" />
        </div>
        <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-background/60 p-4">
          <div>
            <p className="text-sm font-medium">Add company descriptions from their websites</p>
            <p className="text-xs text-muted-foreground">
              For contacts linked to a company, reads the title and description of the website you saved on that company. Only the company&apos;s own home page is read.
            </p>
          </div>
          <Switch checked={web} disabled={busy || !on} onCheckedChange={(v: boolean) => save.mutate({ contact_enrichment_web: v })} aria-label="Add company descriptions from their websites" />
        </div>
      </div>
    </GlassPanel>
  );
}
