import { cn } from "@/lib/utils";

/** The MarketFlow tile (same drawing as favicon.svg), always in the brand colour. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" aria-hidden className={cn("h-8 w-8 shrink-0", className)}>
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <path d="M16 46V18h5.5l10.5 17 10.5-17H48v28h-5.5V28L33 43h-2L21.5 28v18H16z" className="fill-primary-foreground" />
    </svg>
  );
}
