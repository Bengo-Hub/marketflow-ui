"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImageUploader } from "@/components/media/image-uploader";
import { ErrorState } from "@/components/ui-kit";
import { BRAND_IMAGE_DEFAULTS, brandImagesApi, type BrandImageList } from "@/lib/api/brand-images";
import { apiErrorMessage } from "@/lib/api/errors";

export const brandImagesKey = (orgSlug: string) => ["brand-images", orgSlug] as const;

/**
 * The business's brand images: 3 to 5 pictures of the shop, the team or the products in use.
 * Video ads and presenter videos need them; posters use them when an offering has few photos.
 * They are private: links expire within minutes, so the list refetches before they do.
 */
export function BrandImagesPanel({ onChange }: { onChange?: (count: number) => void }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const list = useQuery({ queryKey: brandImagesKey(orgSlug), queryFn: brandImagesApi.list, refetchInterval: 10 * 60 * 1000 });
  const settle = (next?: BrandImageList) => {
    if (next) onChange?.(next.images.length);
    void qc.invalidateQueries({ queryKey: ["onboarding"] });
  };
  const upload = useMutation({
    mutationFn: ({ file, name }: { file: Blob; name: string }) => brandImagesApi.upload(file, name),
    onSuccess: async () => settle(await qc.fetchQuery({ queryKey: brandImagesKey(orgSlug), queryFn: brandImagesApi.list })),
  });
  const remove = useMutation({
    mutationFn: (id: string) => brandImagesApi.remove(id),
    onSuccess: async () => settle(await qc.fetchQuery({ queryKey: brandImagesKey(orgSlug), queryFn: brandImagesApi.list })),
  });

  if (list.isError) return <ErrorState message={apiErrorMessage(list.error, "Could not load your brand images.")} onRetry={() => void list.refetch()} />;
  if (list.isLoading) return <div className="h-32 animate-pulse rounded-xl bg-muted" />;
  const d = list.data ?? { ...BRAND_IMAGE_DEFAULTS, images: [] };
  return (
    <ImageUploader
      label="Brand images"
      images={d.images}
      min={d.min}
      max={d.max}
      limits={{ maxBytes: d.max_bytes, minShortSide: d.min_short_side }}
      onUpload={(file, name) =>
        upload.mutateAsync({ file, name }).catch((e) => {
          throw new Error(apiErrorMessage(e, "The upload failed. Try again."));
        })
      }
      onDelete={(id) =>
        remove.mutateAsync(id).catch((e) => {
          throw new Error(apiErrorMessage(e, "Could not delete the picture."));
        })
      }
    />
  );
}
