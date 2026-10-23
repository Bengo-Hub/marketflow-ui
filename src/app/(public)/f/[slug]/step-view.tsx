"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { recordFunnelStepView } from "@/lib/api/public";

/** Records a funnel step view once, when at least half of the step is on screen (drop-off analytics). */
export function StepView({ funnelSlug, index, children }: { funnelSlug: string; index: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          recordFunnelStepView(funnelSlug, index);
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [funnelSlug, index]);
  return <div ref={ref}>{children}</div>;
}
