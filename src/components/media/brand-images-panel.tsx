"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Globe } from "lucide-react";
import { toast } from "sonner";
import { ImageUploader } from "@/components/media/image-uploader";
import { Button } from "@/components/ui/button";
import { ErrorState } from "@/components/ui-kit";
import { BRAND_IMAGE_DEFAULTS, brandImagesApi, describeImport, type BrandImageList } from "@/lib/api/brand-images";
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
  const key = brandImagesKey(orgSlug);
  // Reload the list after a change. Several uploads finish close together: fetchQuery would join a
  // reload already in flight (started before the last upload was saved) and keep its stale list,
  // so only some pictures showed. cancelRefetch drops that older reload and asks again.
  const refresh = async () => {
    await qc.refetchQueries({ queryKey: key, exact: true }, { cancelRefetch: true });
    const next = qc.getQueryData<BrandImageList>(key);
    if (next) onChange?.(next.images.length);
    void qc.invalidateQueries({ queryKey: ["onboarding"] });
  };
  const upload = useMutation({
    mutationFn: ({ file, name }: { file: Blob; name: string }) => brandImagesApi.upload(file, name),
    onSuccess: async (added) => {
      // Show the new picture at once, then confirm with the server's list.
      qc.setQueryData<BrandImageList>(key, (cur) => (cur && !cur.images.some((i) => i.id === added.id) ? { ...cur, images: [...cur.images, added] } : cur));
      await refresh();
    },
  });
  const remove = useMutation({
    mutationFn: (id: string) => brandImagesApi.remove(id),
    onSuccess: async (_, id) => {
      qc.setQueryData<BrandImageList>(key, (cur) => (cur ? { ...cur, images: cur.images.filter((i) => i.id !== id) } : cur));
      await refresh();
    },
  });
  // Website pictures first (owner, 2026-11-14): link what the business already shows on its site.
  const fromSite = useMutation({
    mutationFn: brandImagesApi.importFromSite,
    onSuccess: async (r) => {
      (r.added.length > 0 ? toast.success : toast.info)(describeImport(r));
      await refresh();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not read your website. Upload your pictures instead.")),
  });

  if (list.isError) return <ErrorState message={apiErrorMessage(list.error, "Could not load your brand images.")} onRetry={() => void list.refetch()} />;
  if (list.isLoading) return <div className="h-32 animate-pulse rounded-xl bg-muted" />;
  const d = list.data ?? { ...BRAND_IMAGE_DEFAULTS, images: [] };
  return (
    <div className="space-y-3">
      {d.images.length < d.max && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed p-3 text-sm">
          <span className="text-muted-foreground">Already have photos on your website? Use those first.</span>
          <Button type="button" size="sm" variant="outline" className="gap-1.5" disabled={fromSite.isPending} onClick={() => fromSite.mutate()}>
            <Globe className="h-4 w-4" />
            {fromSite.isPending ? "Reading your website..." : "Use pictures from my website"}
          </Button>
        </div>
      )}
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
    </div>
  );
}
