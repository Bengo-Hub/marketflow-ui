import { apiClient } from "./client";

/** One brand image as marketflow-api shows it: a private file behind a link that expires in minutes. */
export interface BrandImage {
  id: string;
  url: string;
  content_type: string;
  width: number;
  height: number;
  bytes: number;
  name?: string;
  uploaded_at: string;
}

/** GET /api/v1/tenant/brand-images: the images and the server's limits (config, not code). */
export interface BrandImageList {
  images: BrandImage[];
  min: number;
  max: number;
  max_bytes: number;
  min_short_side: number;
}

/** Used until the list loads; the server's numbers replace them. */
export const BRAND_IMAGE_DEFAULTS = { min: 3, max: 5, max_bytes: 2 * 1024 * 1024, min_short_side: 1024 };

export const brandImagesApi = {
  list: () =>
    apiClient.get<BrandImageList>("/api/v1/tenant/brand-images").then((r) => ({ ...BRAND_IMAGE_DEFAULTS, ...r.data, images: r.data.images ?? [] })),
  upload: (file: Blob, name: string) => {
    const form = new FormData();
    form.append("file", file, name);
    // Axios sets multipart/form-data with the boundary itself for FormData bodies.
    return apiClient.post<BrandImage>("/api/v1/tenant/brand-images", form).then((r) => r.data);
  },
  remove: (id: string) => apiClient.delete(`/api/v1/tenant/brand-images/${encodeURIComponent(id)}`).then(() => undefined),
};

/** True when a creative call was refused because the business has too few brand images. */
export function isBrandImagesRequired(e: unknown): boolean {
  const data = (e as { response?: { status?: number; data?: { code?: unknown } } })?.response;
  return data?.status === 409 && data?.data?.code === "brand_images_required";
}
