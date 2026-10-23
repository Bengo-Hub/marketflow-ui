"use client";

import { useEffect } from "react";
import { recordProfileEvent, type ProfileEvent } from "@/lib/api/public";

/**
 * Records the page view and clicks on elements marked data-track="<event>" (plus an optional
 * data-track-meta JSON object). Replaces the old inline script that guessed events from hrefs.
 */
export function ProfileTracker({ slug }: { slug: string }) {
  useEffect(() => {
    recordProfileEvent(slug, "page_view");
    const onClick = (e: MouseEvent) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>("[data-track]");
      if (!el) return;
      let meta: Record<string, unknown> | undefined;
      try {
        meta = el.dataset.trackMeta ? JSON.parse(el.dataset.trackMeta) : undefined;
      } catch {
        meta = undefined;
      }
      recordProfileEvent(slug, el.dataset.track as ProfileEvent, meta);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [slug]);
  return null;
}
