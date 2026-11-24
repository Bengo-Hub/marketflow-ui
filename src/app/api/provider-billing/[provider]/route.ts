import { NextResponse } from "next/server";
import { API_URL, APP_URL } from "@/lib/urls";

const PROVIDER = /^[a-z0-9_-]{1,40}$/;

/**
 * GET /api/provider-billing/<provider>: forwards to that provider's own billing page.
 *
 * The platform owner's WhatsApp balance alert (provider_balance_low) has its button on this
 * domain, since Meta fixes a button's domain when it approves the template. The button opens
 * this route, which looks the page up in marketflow-api (the provider card's billing_url, or the
 * provider's default) and redirects there. An unknown provider, or marketflow-api being down,
 * lands on the providers page instead.
 */
export async function GET(_req: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const fallback = `${APP_URL}/platform/providers`;
  const name = provider.toLowerCase();
  if (!PROVIDER.test(name)) return NextResponse.redirect(fallback, 302);
  try {
    const r = await fetch(`${API_URL}/api/v1/public/provider-billing/${name}`, { next: { revalidate: 300 } });
    if (r.ok) {
      const body = (await r.json()) as { url?: string };
      if (body.url && body.url.startsWith("https://")) return NextResponse.redirect(body.url, 302);
    }
  } catch {
    // fall through to the providers page
  }
  return NextResponse.redirect(fallback, 302);
}
