"use client";

import { ArrowDown, ArrowUp, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Offering } from "@/lib/api/public";
import { cn } from "@/lib/utils";

/**
 * The Forever tenant's featured products on the public page (owner, 2026-11-03). Every
 * distributor sells the same seeded Forever products (marketflow-api DefaultFLPOfferings),
 * each linked to the distributor's own shop through the distributor ID, so nothing is typed,
 * added or removed: the distributor only chooses which to show and in what order. Other tenants
 * never declare products; their offerings come from their own catalogue.
 */
export function FeaturedProductsCurator({ value, onChange }: { value: Offering[]; onChange: (next: Offering[]) => void }) {
  const update = (i: number, patch: Partial<Offering>) => onChange(value.map((o, j) => (j === i ? { ...o, ...patch } : o)));
  const move = (i: number, d: -1 | 1) => {
    const j = i + d;
    if (j < 0 || j >= value.length) return;
    const next = value.slice();
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  if (value.length === 0) {
    return (
      <p className="rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
        Your Forever products appear here once your account is set up as a Forever Business Owner.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {value.map((o, i) => (
        <li
          key={o.flp_item_code || o.name || i}
          className={cn("flex items-center gap-3 rounded-2xl border border-border bg-background/60 p-3", o.hidden && "opacity-60")}
        >
          {o.image_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={o.image_url} alt="" className="h-14 w-14 shrink-0 rounded-xl object-cover" loading="lazy" />
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">
              {o.name}
              {o.flp_item_code && <span className="ml-2 text-xs font-normal text-muted-foreground">Item {o.flp_item_code}</span>}
            </p>
            {o.description && <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{o.description}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {o.hidden ? "Hidden from your page." : o.flp_item_code ? "Opens this product in your Forever shop." : "Shown on your page."}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${o.name} up`} disabled={i === 0} onClick={() => move(i, -1)}>
              <ArrowUp />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label={`Move ${o.name} down`} disabled={i === value.length - 1} onClick={() => move(i, 1)}>
              <ArrowDown />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={o.hidden ? `Show ${o.name} on the public page` : `Hide ${o.name} from the public page`}
              onClick={() => update(i, { hidden: !o.hidden || undefined })}
            >
              {o.hidden ? <EyeOff /> : <Eye />}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
