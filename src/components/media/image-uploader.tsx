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
  formatBytes,
  imageCountLabel,
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

/** Draws a WebP picture onto a canvas and saves it as a JPEG, which the server accepts. */
async function toJpeg(bitmap: ImageBitmap): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser could not convert the picture. Save it as a JPEG and try again.");
  ctx.drawImage(bitmap, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
  if (!blob) throw new Error("This browser could not convert the picture. Save it as a JPEG and try again.");
  return blob;
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
      const sizeError = checkImageDimensions(read.width, read.height, limits);
      if (sizeError) throw new Error(sizeError);
      const blob = file.type === "image/webp" ? await toJpeg(read.bitmap) : file;
      const tooBig = checkImageSize(blob.size, limits);
      if (tooBig) throw new Error(tooBig);
      const name = file.type === "image/webp" ? file.name.replace(/\.webp$/i, "") + ".jpg" : file.name;
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
    await Promise.all(
      chosen.map(async (file) => {
        try {
          const { blob, name } = await prepare(file);
          await onUpload(blob, name);
        } catch (e) {
          found.push(`${file.name}: ${e instanceof Error ? e.message : "upload failed"}`);
        } finally {
          setBusy((n) => n - 1);
        }
      }),
    );
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
          JPEG, PNG or WebP, up to {formatBytes(limits.maxBytes)}, at least {limits.minShortSide} px on the shorter side.
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
