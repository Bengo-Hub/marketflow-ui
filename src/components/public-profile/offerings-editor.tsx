"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Offering } from "@/lib/api/public";
import { cn } from "@/lib/utils";

/** Server limit (marketflow-api tenant.ValidateOfferings). */
export const MAX_OFFERINGS = 24;

/**
 * Edits metadata.offerings: what the public page lists. For Forever tenants an item code is
 * enough; the page links it to the distributor's own Forever shop.
 */
export function OfferingsEditor({
  value,
  onChange,
  isFLP,
}: {
  value: Offering[];
  onChange: (next: Offering[]) => void;
  isFLP: boolean;
}) {
  const update = (i: number, patch: Partial<Offering>) => onChange(value.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="space-y-3">
      {value.length === 0 && (
        <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
          Nothing listed yet. Add the products or services you want visitors to see.
        </p>
      )}
      {value.map((o, i) => (
        <div key={i} className={cn("rounded-2xl border border-border bg-background/60 p-4", o.hidden && "opacity-60")}>
          <div className="grid gap-3 md:grid-cols-[1fr_1fr]">
            <Input aria-label="Name" placeholder="Name" value={o.name} maxLength={80} onChange={(e) => update(i, { name: e.target.value })} />
            <Input
              aria-label="Price or label"
              placeholder={isFLP ? "Price (optional)" : "Price, e.g. KES 1,500"}
              value={o.price_label ?? ""}
              maxLength={40}
              onChange={(e) => update(i, { price_label: e.target.value || undefined })}
            />
            <Textarea
              aria-label="Short description"
              placeholder="One or two sentences"
              className="md:col-span-2"
              rows={2}
              maxLength={280}
              value={o.description ?? ""}
              onChange={(e) => update(i, { description: e.target.value || undefined })}
            />
            <Input
              aria-label="Image link"
              placeholder="Image link (https://...)"
              value={o.image_url ?? ""}
              onChange={(e) => update(i, { image_url: e.target.value || undefined })}
            />
            {isFLP ? (
              <Input
                aria-label="Forever item code"
                placeholder="Forever item code, e.g. 015"
                value={o.flp_item_code ?? ""}
                maxLength={12}
                onChange={(e) => update(i, { flp_item_code: e.target.value.trim() || undefined })}
              />
            ) : (
              <Input
                aria-label="Link"
                placeholder="Link when tapped (optional)"
                value={o.url ?? ""}
                onChange={(e) => update(i, { url: e.target.value || undefined })}
              />
            )}
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {isFLP && o.flp_item_code ? "Opens this product in your Forever shop." : o.url ? "Opens your link." : "Shown without a link."}
            </p>
            <div className="flex items-center gap-1">
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp />
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Move down" disabled={i === value.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={o.hidden ? "Show on the public page" : "Hide from the public page"}
                onClick={() => update(i, { hidden: !o.hidden || undefined })}
              >
                {o.hidden ? <EyeOff /> : <Eye />}
              </Button>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="Remove" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                <Trash2 className="text-destructive" />
              </Button>
            </div>
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" disabled={value.length >= MAX_OFFERINGS} onClick={() => onChange([...value, { name: "" }])}>
        <Plus />
        {isFLP ? "Add a product" : "Add a product or service"}
      </Button>
      {value.length >= MAX_OFFERINGS && <p className="text-xs text-muted-foreground">You can list up to {MAX_OFFERINGS} items.</p>}
    </div>
  );
}
