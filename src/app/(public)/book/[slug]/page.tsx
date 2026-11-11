import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { BookingWidget } from "@/components/booking/booking-widget";
import { PoweredByBadge } from "@/components/powered-by";
import { AppCanvas } from "@/components/ui-kit";
import { getPublicProfile, getTenantBrandColor } from "@/lib/api/public";
import { brandCss } from "@/lib/brand";
import { DOMAIN_TENANT_HEADER, domainAllows } from "@/lib/tenant-domains";

/**
 * Book a call with any tenant: the booking that used to live only on the /p page. Since /p is for
 * Forever tenants only (owner, 2026-11-03), every other tenant books here, and the instant lead
 * follow-up (Sprint 23) links its booking button to this page through {{booking_link}}.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicProfile(slug);
  if (!p) return { title: "Page not found" };
  return { title: `Book a call with ${p.name || p.slug}`, robots: { index: false } };
}

export default async function BookPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!domainAllows((await headers()).get(DOMAIN_TENANT_HEADER), slug)) notFound();
  const [profile, accountColor] = await Promise.all([getPublicProfile(slug), getTenantBrandColor(slug)]);
  // Booking can be switched off on the profile; then there is nothing to book.
  if (!profile || profile.metadata?.booking_enabled === false) notFound();
  const name = profile.name || profile.slug;
  const color = profile.metadata?.brand_primary_color || accountColor;

  return (
    <div className="pp-scope app-surface relative min-h-dvh">
      {/* The tenant's colour, validated in brandCss, scoped to this page (same as /p). */}
      <style>{brandCss(color, ".pp-scope")}</style>
      <AppCanvas />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Book a call with {name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">A short, free introduction call. Pick a time that suits you.</p>
        <div className="mt-8">
          <BookingWidget tenantSlug={profile.slug} />
        </div>
        <div className="mt-10">
          <PoweredByBadge />
        </div>
      </main>
    </div>
  );
}
