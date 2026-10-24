import Image from "next/image";
import { cn } from "@/lib/utils";

/** The MarketFlow app tile (public/logo-mark.svg): the Codevertex vertex mark over a growth chart, as on the mail-ui tile. */
export function BrandMark({ className }: { className?: string }) {
  return <Image src="/logo-mark.svg" alt="" aria-hidden width={32} height={32} unoptimized priority className={cn("h-8 w-8 shrink-0", className)} />;
}
