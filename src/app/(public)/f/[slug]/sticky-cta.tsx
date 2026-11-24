"use client";

import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";

/**
 * The phone-width bar that keeps the page's one call to action in reach. It hides while the
 * target (the main form or action) is on screen, so it never covers what it points to.
 */
export function StickyCta({ targetId, label }: { targetId: string; label: string }) {
  const [targetVisible, setTargetVisible] = useState(true);
  useEffect(() => {
    const el = document.getElementById(targetId);
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver((entries) => setTargetVisible(entries.some((e) => e.isIntersecting)), { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, [targetId]);

  return (
    <div
      aria-hidden={targetVisible}
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-border/60 bg-background/90 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur transition-transform duration-200 motion-reduce:transition-none md:hidden ${
        targetVisible ? "pointer-events-none translate-y-full" : "translate-y-0"
      }`}
    >
      <a
        href={`#${targetId}`}
        tabIndex={targetVisible ? -1 : 0}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary px-5 text-base font-semibold text-primary-foreground shadow-soft transition-colors hover:bg-primary-dark"
      >
        {label}
        <ArrowDown className="h-4 w-4" aria-hidden />
      </a>
    </div>
  );
}
