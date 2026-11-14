"use client";

import { Check, Lock } from "lucide-react";
import { useBusinessTypes } from "@/hooks/use-tenant-profile";
import { businessTypeLabel, isAdminOnlyType, ownerChoices } from "@/lib/business-types";
import { cn } from "@/lib/utils";

/**
 * Picks the business type (Sprint 7 #32). Each type brings its own advertising rules, which shape
 * every ad script, caption and chat answer, so each option shows what it means. Forever Living is
 * set by a MarketFlow admin only (owner, 2026-11-14): it is hidden from the choices and shown
 * read-only when it is the tenant's type.
 */
export function BusinessTypePicker({ value, onChange, name = "business-type" }: { value: string; onChange: (key: string) => void; name?: string }) {
  const types = useBusinessTypes();
  if (isAdminOnlyType(types.data, value)) {
    const t = types.data?.find((o) => o.key === value);
    return (
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-3 text-sm">
        <Lock className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden />
        <div>
          <p className="font-medium text-foreground">{businessTypeLabel(types.data, value)}</p>
          {t?.description && <p className="mt-0.5 text-xs text-muted-foreground">{t.description}</p>}
          <p className="mt-1 text-xs text-muted-foreground">Only MarketFlow support can change this type. Contact us if it is wrong.</p>
        </div>
      </div>
    );
  }
  if (types.isLoading) return <div className="h-32 animate-pulse rounded-xl bg-muted" aria-busy />;
  if (types.isError || !types.data?.length) {
    return <p className="text-sm text-muted-foreground">The list of business types did not load. Try again in a moment.</p>;
  }
  return (
    <fieldset>
      <legend className="sr-only">Type of business</legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {ownerChoices(types.data).map((t) => {
          const checked = t.key === value;
          return (
            <label
              key={t.key}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border p-3 text-sm transition-colors focus-within:ring-2 focus-within:ring-ring",
                checked ? "border-primary bg-primary/5" : "border-border bg-background/60 hover:bg-muted",
              )}
            >
              <input type="radio" name={name} value={t.key} checked={checked} onChange={() => onChange(t.key)} className="sr-only" />
              <span
                aria-hidden
                className={cn("mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border", checked ? "border-primary bg-primary text-primary-foreground" : "border-input")}
              >
                {checked && <Check className="size-3" />}
              </span>
              <span className="min-w-0">
                <span className="block font-medium text-foreground">{t.label}</span>
                <span className="mt-0.5 block text-xs text-muted-foreground">{t.description}</span>
              </span>
            </label>
          );
        })}
      </div>
      {!value && <p className="mt-2 text-xs text-muted-foreground">Not chosen yet. Pick the one closest to your business.</p>}
    </fieldset>
  );
}
