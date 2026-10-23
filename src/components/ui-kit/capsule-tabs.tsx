"use client";

import { cn } from "@/lib/utils";

export interface TabOption<T extends string = string> {
  value: T;
  label: string;
  count?: number;
}

/** Capsule segmented tabs, the filter and view switcher used across the app (library-ui recipe). */
export function CapsuleTabs<T extends string>({
  options,
  value,
  onChange,
  className,
  label,
}: {
  options: TabOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  /** Accessible name for the group, e.g. "Filter leads by status". */
  label?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn("inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-2xl bg-accent/60 p-1 scrollbar-hide", className)}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors",
              active
                ? "bg-primary text-primary-foreground shadow-soft"
                : "text-muted-foreground hover:bg-background/70 hover:text-foreground",
            )}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] font-bold tabular",
                  active ? "bg-primary-foreground/20 text-primary-foreground" : "bg-foreground/10 text-foreground/70",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
