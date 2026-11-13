"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ImagePlus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { isBrandImagesRequired } from "@/lib/api/brand-images";

/**
 * Shown on the video ad and presenter forms when marketflow-api answers brand_images_required:
 * video ads use pictures of the business, so the owner is sent to the upload step. Posters never
 * need them.
 */
export function BrandImagesRequired({ error }: { error: unknown }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  if (!isBrandImagesRequired(error)) return null;
  const min = (error as { response?: { data?: { details?: { min?: number } } } }).response?.data?.details?.min ?? 3;
  return (
    <div role="alert" className="flex flex-col gap-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
      <p>
        Video ads and presenter videos use pictures of your business. Upload at least {min} brand images first; posters work without them.
      </p>
      <Link href={`/${orgSlug}/onboarding`} className={buttonVariants({ size: "sm", className: "shrink-0" })}>
        <ImagePlus /> Add pictures
      </Link>
    </div>
  );
}
