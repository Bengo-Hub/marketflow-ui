"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { TriangleAlert } from "lucide-react";
import { brandImagesKey } from "@/components/media/brand-images-panel";
import { ImageUploader } from "@/components/media/image-uploader";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MediaImage } from "@/components/media-image";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BRAND_IMAGE_DEFAULTS, brandImagesApi, SCREEN_DEVICES, type ScreenDevice } from "@/lib/api/brand-images";
import { apiErrorMessage } from "@/lib/api/errors";
import { toast } from "sonner";

/**
 * Screenshots of the business's own app. A video scene that shows a laptop, tablet, till or phone
 * carries one of them on its screen instead of an invented screen. Nothing is hidden or blurred for
 * the owner, so an upload needs the statement that no customer's data is visible.
 */
export function ScreenshotsPanel() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const key = brandImagesKey(orgSlug);
  const list = useQuery({ queryKey: key, queryFn: brandImagesApi.list, refetchInterval: 10 * 60 * 1000 });
  const [safe, setSafe] = useState(false);
  const [device, setDevice] = useState<ScreenDevice>("auto");
  const refresh = () => qc.refetchQueries({ queryKey: key, exact: true }, { cancelRefetch: true });
  const upload = useMutation({
    mutationFn: ({ file, name }: { file: Blob; name: string }) => brandImagesApi.uploadScreenshot(file, name, device),
    onSuccess: refresh,
  });
  const remove = useMutation({ mutationFn: brandImagesApi.remove, onSuccess: refresh });
  const mark = useMutation({
    mutationFn: ({ id, screenshot, on }: { id: string; screenshot: boolean; on?: ScreenDevice }) =>
      brandImagesApi.setKind(id, screenshot ? "screenshot" : "photo", on ?? "auto", screenshot && safe),
    onSuccess: refresh,
    onError: (e) => toast.error(apiErrorMessage(e, "Could not change the picture.")),
  });

  if (!list.data) return null;
  const d = { ...BRAND_IMAGE_DEFAULTS, ...list.data };
  return (
    <div className="space-y-4">
      <div role="note" className="flex gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
        <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
        <p>
          Do not upload a screen that shows customer data: names, phone numbers, payments, messages or records. We show the screenshot as it
          is and blur nothing. Use a demo account instead.
        </p>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <Checkbox checked={safe} onCheckedChange={(v) => setSafe(v === true)} className="mt-0.5" />
        My screenshots show no customer&apos;s data.
      </label>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <span className="text-muted-foreground">New screenshots are for</span>
        <Select value={device} onValueChange={(v) => setDevice(v as ScreenDevice)}>
          <SelectTrigger className="w-44" aria-label="Device">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SCREEN_DEVICES.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <ImageUploader
        label="Screenshots"
        images={d.screenshots}
        min={0}
        max={d.max_screens}
        limits={{ maxBytes: d.max_bytes, minShortSide: d.min_screen_short_side }}
        onUpload={async (file, name) => {
          if (!safe) throw new Error("Tick that your screenshots show no customer's data first.");
          try {
            await upload.mutateAsync({ file, name });
          } catch (e) {
            throw new Error(apiErrorMessage(e, "The upload failed. Try again."));
          }
        }}
        onDelete={(id) =>
          remove.mutateAsync(id).catch((e) => {
            throw new Error(apiErrorMessage(e, "Could not delete the picture."));
          })
        }
      />
      {d.screenshots.length > 0 && (
        <ul className="flex flex-wrap gap-2 text-sm">
          {d.screenshots.map((img) => (
            <li key={img.id} className="flex items-center gap-2 rounded-lg border p-2">
              <span className="max-w-40 truncate">{img.name || "Screenshot"}</span>
              <span className="text-muted-foreground">{SCREEN_DEVICES.find((o) => o.value === (img.device || "auto"))?.label}</span>
              <Button type="button" size="sm" variant="ghost" disabled={mark.isPending} onClick={() => mark.mutate({ id: img.id, screenshot: false })}>
                Use as a photo
              </Button>
            </li>
          ))}
        </ul>
      )}
      {d.images.length > 0 && d.screenshots.length < d.max_screens && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">One of my brand images is really a screenshot</summary>
          <ul className="mt-2 flex flex-wrap gap-3">
            {d.images.map((img) => (
              <li key={img.id} className="w-28 space-y-1">
                <MediaImage src={img.url} displayWidth={128} alt={img.name || "Brand image"} className="aspect-square w-full rounded-lg object-cover" />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="w-full"
                  disabled={!safe || mark.isPending}
                  onClick={() => mark.mutate({ id: img.id, screenshot: true, on: device })}
                >
                  It is a screenshot
                </Button>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
