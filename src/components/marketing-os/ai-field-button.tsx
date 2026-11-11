"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiError, marketingOsApi, type FieldSuggestion } from "@/lib/api/marketing-os";

/**
 * "Generate with AI" for one form field (owner, 2026-11-11). It writes from the business's own
 * brand context, catalogue and the other fields in the form, on the free model tier, and fills
 * the field for the owner to edit. Nothing is saved until the owner saves the form.
 */
export function AIFieldButton({
  field,
  form,
  onResult,
  label = "Generate with AI",
  disabled,
}: {
  /** A key of marketflow-ai team.FieldSpecs. */
  field: string;
  /** The other fields' current values, read when clicked. */
  form: () => Record<string, string>;
  onResult: (s: FieldSuggestion) => void;
  label?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      onResult(await marketingOsApi.suggestField(field, form()));
    } catch (e) {
      toast.error(apiError(e, "The assistant could not write this field just now. Try again."));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button type="button" variant="ghost" size="sm" onClick={run} disabled={busy || disabled} aria-label={`${label}: ${field}`} className="h-8 gap-1.5 px-2 text-xs">
      {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      {busy ? "Writing..." : label}
    </Button>
  );
}
