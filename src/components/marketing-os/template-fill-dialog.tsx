"use client";

import { useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MultiSelectCombobox, SearchableCombobox } from "@bengo-hub/shared-ui-lib/combobox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePublishAccounts } from "@/hooks/use-publishing";
import { marketingOsApi, type Template } from "@/lib/api/marketing-os";
import { PLATFORM_LABEL } from "@/lib/api/publishing";
import { fieldLabel, fillTemplate, templateFields } from "@/lib/templates/fill";

/**
 * Asks for a template's fields before it goes to the manager. The offering choices come from
 * the brand context and the platforms from the connected accounts; anything else is typed.
 * Use is enabled only once every field has a value, so a raw ${field} is never sent.
 */
export function TemplateFillDialog({
  template,
  onClose,
  onUse,
}: {
  template: Template | null;
  onClose: () => void;
  onUse: (text: string) => void;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const fields = useMemo(() => (template ? templateFields(template.template) : []), [template]);
  const wantsOffering = fields.includes("offering");
  const wantsPlatforms = fields.includes("platforms");
  const ctx = useQuery({
    queryKey: ["os-brand-context", orgSlug],
    queryFn: marketingOsApi.brandContext,
    enabled: !!template && wantsOffering,
  });
  const accounts = usePublishAccounts(!!template && wantsPlatforms);
  const [values, setValues] = useState<Record<string, string>>({});
  const [platforms, setPlatforms] = useState<string[]>([]);

  const offerOptions = (ctx.data?.offers ?? []).filter(Boolean).map((o) => ({ value: o, label: o }));
  const platformOptions = [...new Set((accounts.data ?? []).filter((a) => a.enabled && !a.needs_reconnect).map((a) => a.platform))].map(
    (p) => ({ value: PLATFORM_LABEL[p] ?? p, label: PLATFORM_LABEL[p] ?? p }),
  );

  const filled: Record<string, string> = { ...values };
  if (wantsPlatforms && platformOptions.length > 0) filled.platforms = platforms.join(" and ");
  const missing = fields.filter((f) => !(filled[f] ?? "").trim());
  const set = (k: string, v: string) => setValues((s) => ({ ...s, [k]: v }));
  const close = () => {
    setValues({});
    setPlatforms([]);
    onClose();
  };

  return (
    <Dialog open={!!template} onOpenChange={(o) => !o && close()}>
      <DialogContent size="md">
        <DialogHeader>
          <DialogTitle>{template?.title}</DialogTitle>
          <DialogDescription>Fill in the details and the brief goes to your marketing manager.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          {fields.map((f) => (
            <div key={f} className="space-y-1.5">
              <Label>{fieldLabel(f)}</Label>
              {f === "offering" && offerOptions.length > 0 ? (
                <SearchableCombobox
                  options={offerOptions}
                  value={values.offering ?? ""}
                  valueLabel={values.offering}
                  onChange={(v: string) => set("offering", v)}
                  onCreate={(text: string) => {
                    set("offering", text);
                    return { value: text, label: text };
                  }}
                  createLabel="Use"
                  placeholder="Choose what to promote"
                />
              ) : f === "platforms" && platformOptions.length > 0 ? (
                <MultiSelectCombobox options={platformOptions} values={platforms} onChange={setPlatforms} placeholder="Choose the platforms" />
              ) : (
                <Input value={values[f] ?? ""} onChange={(e) => set(f, e.target.value)} aria-label={fieldLabel(f)} />
              )}
            </div>
          ))}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={close}>
            Cancel
          </Button>
          <Button
            disabled={!template || missing.length > 0}
            onClick={() => {
              if (!template) return;
              onUse(fillTemplate(template.template, filled));
              close();
            }}
          >
            Use this
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
