"use client";

import { useState } from "react";
import { Play } from "lucide-react";

/** Shows a still and loads the player only when the visitor presses play (no third-party load on page open). */
export function VideoFacade({ src, thumb, title }: { src: string; thumb: string | null; title: string }) {
  const [playing, setPlaying] = useState(false);
  if (playing) {
    return (
      <iframe
        src={src}
        title={title}
        className="aspect-video w-full rounded-[1.25rem]"
        allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
        allowFullScreen
      />
    );
  }
  return (
    <button
      type="button"
      onClick={() => setPlaying(true)}
      aria-label={`Play video: ${title}`}
      className="group relative block aspect-video w-full overflow-hidden rounded-[1.25rem] bg-foreground/90"
    >
      {thumb && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumb} alt="" loading="lazy" className="absolute inset-0 h-full w-full object-cover opacity-90" />
      )}
      <span className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/90 text-primary shadow-lift transition-transform group-hover:scale-105 motion-reduce:transform-none">
          <Play className="ml-1 h-7 w-7" fill="currentColor" />
        </span>
      </span>
    </button>
  );
}
