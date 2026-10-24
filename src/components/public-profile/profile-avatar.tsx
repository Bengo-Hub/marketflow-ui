"use client";

import { useState } from "react";
import { MediaImage } from "@/components/media-image";

/** The round profile photo on /p. A missing or broken link shows the first letter of the name instead. */
export function ProfileAvatar({ src, name }: { src?: string | null; name: string }) {
  const [failed, setFailed] = useState(false);
  if (src && !failed) {
    return (
      // An image that failed before hydration never fires onError, so the wrapper checks it once mounted.
      <span
        className="contents"
        ref={(el) => {
          const img = el?.querySelector("img");
          if (img && img.complete && img.naturalWidth === 0) setFailed(true);
        }}
      >
        <MediaImage
          src={src}
          displayWidth={96}
          fit="cover"
          aspect={1}
          loading="eager"
          alt={name}
          onError={() => setFailed(true)}
          className="mx-auto h-24 w-24 rounded-full border-4 border-background object-cover shadow-soft"
        />
      </span>
    );
  }
  return (
    <div role="img" aria-label={name} className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-background bg-primary font-display text-3xl font-semibold text-primary-foreground shadow-soft">
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
