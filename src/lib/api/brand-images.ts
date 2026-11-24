import { apiClient, MULTIPART } from "./client";

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
  /** Address of a picture linked from the business's website. */
  source?: string;
  /** Where on the website it was found, such as "Services page" or "Home page, hero". */
  from?: string;
  /** "screenshot" for a screen of the business's own app, shown on a device in video scenes. */
  kind?: string;
  /** The device a screenshot is for; empty goes by its shape. */
  device?: string;
}

/** Devices a screenshot can be shown on; "auto" lets its shape decide. */
export const SCREEN_DEVICES = [
  { value: "auto", label: "Any device" },
  { value: "laptop", label: "Laptop" },
  { value: "tablet", label: "Tablet" },
  { value: "pos", label: "Till (POS)" },
  { value: "phone", label: "Phone" },
] as const;

export type ScreenDevice = (typeof SCREEN_DEVICES)[number]["value"];

/** The API's device value: "" goes by the picture's shape. */
const deviceValue = (d: ScreenDevice) => (d === "auto" ? "" : d);

/** The query a screenshot upload carries; no_customer_data is the owner's own statement. */
export function screenshotQuery(device: ScreenDevice): string {
  return new URLSearchParams({ kind: "screenshot", device: deviceValue(device), no_customer_data: "true" }).toString();
}

/** GET /api/v1/tenant/brand-images: the images and the server's limits (config, not code). */
export interface BrandImageList {
  images: BrandImage[];
  min: number;
  max: number;
  max_bytes: number;
  min_short_side: number;
  screenshots: BrandImage[];
  max_screens: number;
  min_screen_short_side: number;
}

/** Used until the list loads; the server's numbers replace them. */
export const BRAND_IMAGE_DEFAULTS = { min: 3, max: 5, max_bytes: 2 * 1024 * 1024, min_short_side: 1024, max_screens: 6, min_screen_short_side: 600 };

export const brandImagesApi = {
  list: () =>
    apiClient.get<BrandImageList>("/api/v1/tenant/brand-images").then((r) => ({ ...BRAND_IMAGE_DEFAULTS, ...r.data, images: r.data.images ?? [], screenshots: r.data.screenshots ?? [] })),
  upload: (file: Blob, name: string) => {
    const form = new FormData();
    form.append("file", file, name);
    return apiClient.post<BrandImage>("/api/v1/tenant/brand-images", form, MULTIPART).then((r) => r.data);
  },
  /** Only called once the owner stated that no customer's data is visible. */
  uploadScreenshot: (file: Blob, name: string, device: ScreenDevice) => {
    const form = new FormData();
    form.append("file", file, name);
    return apiClient.post<BrandImage>(`/api/v1/tenant/brand-images?${screenshotQuery(device)}`, form, MULTIPART).then((r) => r.data);
  },
  /** Marks a picture as a screenshot or back as a photo. */
  setKind: (id: string, kind: "screenshot" | "photo", device: ScreenDevice, noCustomerData: boolean) =>
    apiClient
      .patch<BrandImage>(`/api/v1/tenant/brand-images/${encodeURIComponent(id)}`, { kind, device: deviceValue(device), no_customer_data: noCustomerData })
      .then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/api/v1/tenant/brand-images/${encodeURIComponent(id)}`).then(() => undefined),
  /** Links pictures from the business's own website and storefront (same checks as an upload). */
  importFromSite: () =>
    apiClient.post<BrandImageImport>("/api/v1/tenant/brand-images/import-site").then((r) => ({
      ...r.data,
      added: r.data.added ?? [],
      skipped: r.data.skipped ?? {},
    })),
};

/** POST /api/v1/tenant/brand-images/import-site: what one website import did. */
export interface BrandImageImport {
  sites: string[];
  found: number;
  added: BrandImage[];
  skipped: Record<string, number>;
  total: number;
  min: number;
}

/** A short sentence for the result of a website import. */
export function describeImport(r: BrandImageImport): string {
  const n = r.added.length;
  if (n > 0) {
    const left = Math.max(0, r.min - r.total);
    const places = [...new Set(r.added.map((a) => a.from).filter((f): f is string => !!f))];
    return (
      `Added ${n} picture${n === 1 ? "" : "s"} from your website` +
      (places.length > 0 ? ` (${places.join("; ")}).` : ".") +
      (left > 0 ? ` Upload ${left} more to finish.` : "")
    );
  }
  if (r.found === 0) return "No pictures were found on your website. Upload your own instead.";
  if (r.skipped.too_small) return "Your website's pictures are too small (at least 1024 px on the short side). Upload larger ones.";
  return "No new pictures could be used from your website. Upload your own instead.";
}

/** True when a creative call was refused because the business has too few brand images. */
export function isBrandImagesRequired(e: unknown): boolean {
  const data = (e as { response?: { status?: number; data?: { code?: unknown } } })?.response;
  return data?.status === 409 && data?.data?.code === "brand_images_required";
}
