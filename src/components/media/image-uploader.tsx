"use client";

import { useId, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MediaImage } from "@/components/media-image";
import {
  ACCEPTED_IMAGE_TYPES,
  checkImageDimensions,
  checkImageSize,
  checkImageType,
  fitDimensions,
  formatBytes,
  imageCountLabel,
  BLANK_SPREAD,
  JPEG_QUALITIES,
  lumaSpread,
  SIZE_HEADROOM,
  type ImageLimits,
} from "@/lib/media/image-checks";
import { cn } from "@/lib/utils";

export interface UploaderImage {
  id: string;
  url: string;
  name?: string;
  width?: number;
  height?: number;
}

interface Props {
  images: UploaderImage[];
  min: number;
  max: number;
  limits: ImageLimits;
  /** Sends one checked file; reject with a message to show. */
  onUpload: (file: Blob, name: string) => Promise<unknown>;
  onDelete: (id: string) => Promise<unknown>;
  /** Accessible name, e.g. "brand images". */
  label: string;
  className?: string;
}

/** Reads a picture's size in pixels in the browser. */
async function dimensions(file: Blob): Promise<{ width: number; height: number; bitmap: ImageBitmap }> {
  const bitmap = await createImageBitmap(file);
  return { width: bitmap.width, height: bitmap.height, bitmap };
}

const CONVERT_FAILED = "This browser could not prepare the picture. Save it as a JPEG and try again.";

/** True when a drawn canvas has no detail: a 32 x 32 sample whose brightness barely varies. */
function isBlank(canvas: HTMLCanvasElement): boolean {
  const s = document.createElement("canvas");
  s.width = 32;
  s.height = 32;
  const sctx = s.getContext("2d", { willReadFrequently: true });
  if (!sctx) return false;
  sctx.drawImage(canvas, 0, 0, 32, 32);
  return lumaSpread(sctx.getImageData(0, 0, 32, 32).data) < BLANK_SPREAD;
}

/**
 * Draws a picture at the given size and saves it as a JPEG (which the server accepts), lowering
 * the quality until it fits under the size cap with some headroom.
 */
async function toJpeg(bitmap: ImageBitmap, width: number, height: number, maxBytes: number): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(CONVERT_FAILED);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  // A transparent PNG gets a white background rather than black.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(bitmap, 0, 0, width, height);
  // Under memory pressure a browser can return a blank canvas, which uploaded as a plain picture
  // (owner report, 2026-11-14). Draw once more if it came out blank; refuse it if it still does.
  if (isBlank(canvas)) {
    await new Promise((r) => setTimeout(r, 50));
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);
    if (isBlank(canvas)) throw new Error("This picture came out blank after resizing. Try again, or use another file.");
  }
  let last: Blob | null = null;
  for (const q of JPEG_QUALITIES) {
    last = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", q));
    if (!last) throw new Error(CONVERT_FAILED);
    if (last.size <= maxBytes * SIZE_HEADROOM) return last;
  }
  return last!;
}

/**
 * A small reusable image uploader: previews, delete, a "3 of 5" count, and type, size and
 * resolution checks before anything is sent. MarketFlow has no shared uploader in
 * shared-ui-lib, so this one lives here.
 */
export function ImageUploader({ images, min, max, limits, onUpload, onDelete, label, className }: Props) {
  const inputId = useId();
  const input = useRef<HTMLInputElement>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [busy, setBusy] = useState(0);
  const [deleting, setDeleting] = useState<string | null>(null);
  const room = Math.max(0, max - images.length - busy);

  const prepare = async (file: File): Promise<{ blob: Blob; name: string }> => {
    const typeError = checkImageType(file.type);
    if (typeError) throw new Error(typeError);
    let read: Awaited<ReturnType<typeof dimensions>>;
    try {
      read = await dimensions(file);
    } catch {
      throw new Error("This picture could not be opened. Try another file.");
    }
    try {
      // Pictures are resized to what the server expects (owner, 2026-11-14): a slightly small one
      // is enlarged to the minimum, a very large one reduced; only a far too small one is refused.
      const fit = fitDimensions(read.width, read.height, limits);
      if (fit.error) throw new Error(fit.error);
      const keep = !fit.resized && file.type !== "image/webp" && file.size <= limits.maxBytes * SIZE_HEADROOM;
      const blob = keep ? file : await toJpeg(read.bitmap, fit.width, fit.height, limits.maxBytes);
      const tooBig = checkImageSize(blob.size, limits);
      if (tooBig) throw new Error(tooBig);
      const sizeError = checkImageDimensions(fit.width, fit.height, limits);
      if (sizeError) throw new Error(sizeError);
      const name = keep ? file.name : file.name.replace(/\.(webp|png|jpe?g)$/i, "") + ".jpg";
      return { blob, name };
    } finally {
      read.bitmap.close();
    }
  };

  const pick = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    const found: string[] = [];
    if (files.length > room) found.push(`Only ${room} more ${room === 1 ? "picture fits" : "pictures fit"}; the rest were left out.`);
    const chosen = files.slice(0, room);
    setBusy((n) => n + chosen.length);
    // One at a time: resizing several large pictures on canvases at once can run the browser out
    // of graphics memory and give blank pictures; uploads in order also keep the list in order.
    for (const file of chosen) {
      try {
        const { blob, name } = await prepare(file);
        await onUpload(blob, name);
      } catch (e) {
        found.push(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}`);
      } finally {
        setBusy((n) => n - 1);
      }
    }
    setErrors(found);
    if (input.current) input.current.value = "";
  };

  const remove = async (id: string) => {
    setDeleting(id);
    try {
      await onDelete(id);
      setErrors([]);
    } catch (e) {
      setErrors([e instanceof Error ? e.message : "Could not delete the picture."]);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium" aria-live="polite">
          {imageCountLabel(images.length, min, max)}
        </p>
        <p className="text-xs text-muted-foreground">
          JPEG, PNG or WebP. Pictures are resized for you to at least {limits.minShortSide} px on the shorter side and under{" "}
          {formatBytes(limits.maxBytes)}.
        </p>
      </div>

      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label={label}>
        {images.map((img) => (
          <li key={img.id} className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted">
            <MediaImage src={img.url} displayWidth={256} alt={img.name || "Brand image"} className="size-full object-cover" />
            <Button
              type="button"
              size="icon"
              variant="secondary"
              className="absolute right-2 top-2 size-8 shadow"
              aria-label={`Delete ${img.name || "this picture"}`}
              disabled={deleting === img.id}
              onClick={() => void remove(img.id)}
            >
              {deleting === img.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
            </Button>
          </li>
        ))}
        {Array.from({ length: busy }).map((_, i) => (
          <li key={`busy-${i}`} className="grid aspect-square place-items-center rounded-xl border border-dashed border-border bg-muted/50">
            <Loader2 className="size-5 animate-spin text-muted-foreground" aria-label="Uploading" />
          </li>
        ))}
        {room > 0 && (
          <li>
            <label
              htmlFor={inputId}
              className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary focus-within:border-primary"
            >
              <ImagePlus className="size-6" />
              Add pictures
              <input
                ref={input}
                id={inputId}
                type="file"
                multiple
                accept={ACCEPTED_IMAGE_TYPES.join(",")}
                className="sr-only"
                onChange={(e) => void pick(e.target.files)}
              />
            </label>
          </li>
        )}
      </ul>

      {errors.length > 0 && (
        <ul role="alert" className="space-y-1 text-sm text-destructive">
          {errors.map((m) => (
            <li key={m}>{m}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
