import type { Offering, PublicProfile } from "@/lib/api/public";

/** http(s) or site-relative URLs only; anything else (javascript:, data:) becomes null. */
export function safeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const v = value.trim();
  if (v.startsWith("/") && !v.startsWith("//")) return v;
  try {
    const u = new URL(v);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** A wa.me link, or null for a missing or obviously fake number (all zeros, one repeated digit). */
export function whatsAppLink(number: string | undefined, text: string): string | null {
  const digits = (number ?? "").replace(/\D/g, "");
  if (digits.length < 9 || /0{5,}/.test(digits) || /(\d)\1{5,}/.test(digits)) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** The distributor's own Forever shop (store and language default to Kenya, English). */
export function flpShopUrl(p: PublicProfile): string | null {
  const d = (p.fbo_distrib_id ?? "").trim();
  if (!d) return null;
  const q = new URLSearchParams({ store: p.flp_store_code || "KEN", language: p.flp_language || "en", distribID: d });
  return `https://shop.foreverliving.com/retail/entry/Shop.do?${q.toString()}`;
}

export function flpJoinUrl(p: PublicProfile): string | null {
  const d = (p.fbo_distrib_id ?? "").trim();
  if (!d) return null;
  const q = new URLSearchParams({
    action: "display",
    store: p.flp_store_code || "KEN",
    distribID: d,
    menuoff: "n",
    langID: p.flp_language || "en",
  });
  return `https://join.foreverliving.com/marketing/joinnow/applicationForm.do?${q.toString()}`;
}

/**
 * Where an offering card opens: its own link if it has one, else for a Forever product the
 * distributor's shop with the item code (the same link the page always used), else nothing.
 */
export function offeringHref(o: Offering, shop: string | null): string | null {
  const own = safeUrl(o.url);
  if (own) return own;
  if (o.flp_item_code && shop) return `${shop}&itemCode=${encodeURIComponent(o.flp_item_code)}`;
  return null;
}

/** YouTube or Vimeo embed URL for a video link, or null for anything else. */
export function videoEmbed(value: unknown): { src: string; thumb: string | null } | null {
  const url = safeUrl(value);
  if (!url || url.startsWith("/")) return null;
  const u = new URL(url);
  const host = u.hostname.replace(/^www\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1);
  else if (host === "youtube.com" || host === "m.youtube.com" || host === "youtube-nocookie.com") {
    id = u.pathname.startsWith("/embed/") ? u.pathname.split("/")[2] : u.searchParams.get("v");
  }
  if (id && /^[\w-]{6,20}$/.test(id)) {
    return { src: `https://www.youtube-nocookie.com/embed/${id}?autoplay=1`, thumb: `https://i.ytimg.com/vi/${id}/hqdefault.jpg` };
  }
  if (host === "vimeo.com" || host === "player.vimeo.com") {
    const vid = u.pathname.split("/").filter(Boolean).pop();
    if (vid && /^\d+$/.test(vid)) return { src: `https://player.vimeo.com/video/${vid}?autoplay=1`, thumb: null };
  }
  return null;
}

/** JSON for a <script type="application/ld+json">, with "<" escaped so user text cannot close the tag. */
export function jsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
