import { cn } from "@/lib/utils";

/**
 * The soft colour wash behind the glass surfaces: two large blurred washes in the brand colour and
 * the canvas tint. Purely decorative, fixed behind the content, and never animated.
 */
export function AppCanvas({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none fixed inset-0 -z-10 overflow-hidden", className)}>
      <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-48 right-[-10rem] h-[36rem] w-[36rem] rounded-full bg-tint/12 blur-3xl" />
      <div className="absolute left-1/2 top-1/3 h-[22rem] w-[22rem] rounded-full bg-primary/5 blur-3xl" />
    </div>
  );
}
