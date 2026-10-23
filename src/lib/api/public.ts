/**
 * Unauthenticated marketflow-api calls for the public pages (/p, /f, booking, lead forms). These
 * use fetch, not the axios apiClient, because apiClient attaches the signed-in user's token and
 * tenant headers, which must never travel with a visitor's request.
 */
import { API_URL } from "@/lib/urls";

const AUTH_API_URL = (process.env.NEXT_PUBLIC_AUTH_API_URL || "https://sso.codevertexafrica.com").replace(/\/$/, "");

export interface Offering {
  name: string;
  description?: string;
  image_url?: string;
  url?: string;
  price_label?: string;
  flp_item_code?: string;
  cc?: string;
  hidden?: boolean;
}

export interface Socials {
  facebook?: string;
  instagram?: string;
  tiktok?: string;
  youtube?: string;
  website?: string;
  linkedin?: string;
}

/** The allow-listed public metadata keys (marketflow-api tenant.PublicMetadataKeys). */
export interface PublicMetadata {
  tagline?: string;
  bio?: string;
  story?: string;
  video_url?: string;
  logo_url?: string;
  cover_url?: string;
  opportunity_text?: string;
  socials?: Socials;
  offerings?: Offering[];
  booking_enabled?: boolean;
  brand_primary_color?: string;
  contact_email?: string;
}

export interface PublicProfile {
  id: string;
  name: string;
  slug: string;
  business_type?: string;
  country?: string;
  whatsapp_number?: string;
  fbo_distrib_id?: string;
  flp_store_code?: string;
  flp_language?: string;
  metadata?: PublicMetadata;
}

export interface Testimonial {
  id: string;
  author_name: string;
  author_role?: string;
  body: string;
  avatar_url?: string;
  rating: number;
}

export interface Slot {
  start: string;
  end: string;
}

const enc = encodeURIComponent;

export async function getPublicProfile(slug: string): Promise<PublicProfile | null> {
  try {
    const r = await fetch(`${API_URL}/api/v1/public/profile/${enc(slug)}`, { next: { revalidate: 300 } });
    return r.ok ? ((await r.json()) as PublicProfile) : null;
  } catch {
    return null;
  }
}

/** The tenant's brand colour from SSO (auth-api owns tenant branding), cached for an hour. */
export async function getTenantBrandColor(slug: string): Promise<string | null> {
  try {
    const r = await fetch(`${AUTH_API_URL}/api/v1/tenants/by-slug/${enc(slug)}`, { next: { revalidate: 3600 } });
    if (!r.ok) return null;
    const t = (await r.json()) as { brand_colors?: { primary?: string }; metadata?: { primary_color?: string } };
    return t.brand_colors?.primary || t.metadata?.primary_color || null;
  } catch {
    return null;
  }
}

export async function getPublicTestimonials(slug: string, limit = 6): Promise<Testimonial[]> {
  try {
    const r = await fetch(`${API_URL}/api/v1/public/profile/${enc(slug)}/testimonials?limit=${limit}`, {
      next: { revalidate: 300 },
    });
    if (!r.ok) return [];
    const j = (await r.json()) as { data?: Testimonial[] };
    return j.data ?? [];
  } catch {
    return [];
  }
}

export async function getPublicFunnel<T>(slug: string): Promise<T | null> {
  try {
    const r = await fetch(`${API_URL}/api/v1/public/funnels/${enc(slug)}`, { next: { revalidate: 60 } });
    return r.ok ? ((await r.json()) as T) : null;
  } catch {
    return null;
  }
}

export async function getAvailability(slug: string, date: string): Promise<{ connected: boolean; slots: Slot[] }> {
  const r = await fetch(`${API_URL}/api/v1/public/availability/${enc(slug)}?date=${enc(date)}`);
  if (!r.ok) throw new Error(`availability ${r.status}`);
  const body = (await r.json()) as { connected?: boolean; slots?: Slot[] };
  return { connected: body.connected !== false, slots: body.slots ?? [] };
}

export class SlotTakenError extends Error {}

export async function createBooking(
  slug: string,
  input: { slot_start: string; name: string; email: string; phone?: string },
): Promise<{ meeting_url?: string }> {
  const r = await fetch(`${API_URL}/api/v1/public/book/${enc(slug)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (r.status === 409) throw new SlotTakenError("That time was just taken. Pick another time.");
  const body = (await r.json().catch(() => null)) as { meeting_url?: string; error?: string; message?: string } | null;
  if (!r.ok) throw new Error(body?.error || body?.message || "Could not book that time. Try again.");
  return body ?? {};
}

export async function createPublicLead(tenantSlug: string, input: Record<string, unknown>): Promise<void> {
  const r = await fetch(`${API_URL}/api/v1/public/leads/${enc(tenantSlug)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!r.ok) {
    const body = (await r.json().catch(() => null)) as { error?: string; message?: string } | null;
    throw new Error(body?.error || body?.message || "Could not send your details. Try again.");
  }
}

export type ProfileEvent =
  | "page_view"
  | "cta_click"
  | "whatsapp_click"
  | "chat_open"
  | "book_click"
  | "product_click"
  | "testimonial_view";

/** Fire and forget: a lost analytics event must never affect the visitor. */
export function recordProfileEvent(slug: string, eventType: ProfileEvent, metadata?: Record<string, unknown>) {
  try {
    void fetch(`${API_URL}/api/v1/public/profile-events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, event_type: eventType, referrer: document.referrer, metadata: metadata ?? {} }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}

export function recordFunnelStepView(funnelSlug: string, stepIndex: number) {
  try {
    void fetch(`${API_URL}/api/v1/public/funnels/${enc(funnelSlug)}/step-view`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ step_index: stepIndex }),
      keepalive: true,
    }).catch(() => undefined);
  } catch {
    // ignore
  }
}
