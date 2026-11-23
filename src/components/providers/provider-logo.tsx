"use client";

import { useState } from "react";
import { logoUrl } from "@/lib/providers/catalog";

export function ProviderLogo({
  slug,
  color,
  name,
  brandColor,
  size = 40,
  className,
}: {
  slug?: string;
  color?: string;
  name: string;
  brandColor?: string;
  size?: number;
  className?: string;
}) {
  const [failed, setFailed] = useState(false);
  const src = logoUrl(slug, color, size);
  if (!slug || failed || !src) {
    return (
      <div
        aria-hidden
        className={`flex shrink-0 items-center justify-center rounded-md text-xs font-bold text-white ${className ?? ""}`}
        style={{
          width: size,
          height: size,
          background: brandColor || "#64748b",
        }}
      >
        {name.split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase()}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      // The provider name sits next to the logo, so the image is decorative.
      src={src}
      alt=""
      width={size}
      height={size}
      // An error fired before hydration is missed by onError; check the loaded image on mount.
      ref={(img) => {
        if (img && img.complete && img.naturalWidth === 0) setFailed(true);
      }}
      onError={() => setFailed(true)}
      style={{ width: size, height: size }}
      className={`shrink-0 overflow-hidden rounded-md object-contain p-1 bg-white ring-1 ring-inset ring-gray-100 ${className ?? ""}`}
    />
  );
}
