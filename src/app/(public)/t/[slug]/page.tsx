import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { PoweredByBadge } from "@/components/powered-by";
import { AppCanvas } from "@/components/ui-kit";
import { getAuthTenantPublic, getPublicProfile, getTenantBrandColor } from "@/lib/api/public";
import { brandCss } from "@/lib/brand";
import { resolvePublicLink } from "@/lib/public-link";
import { DOMAIN_TENANT_HEADER, domainAllows } from "@/lib/tenant-domains";
import { TestimonialForm } from "./testimonial-form";

/**
 * A business's testimonial link (owner, 2026-11-24): customers share their experience here. Every
 * testimonial waits for the business's review before it is shown anywhere. Nurture messages link
 * here through {{testimonial_link}}.
 */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicProfile(slug);
  if (!p) return { title: "Page not found" };
  return { title: `Share your experience with ${p.name || p.slug}`, robots: { index: false } };
}

export default async function TestimonialPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (!domainAllows((await headers()).get(DOMAIN_TENANT_HEADER), slug)) notFound();
  const [profile, accountColor, auth] = await Promise.all([getPublicProfile(slug), getTenantBrandColor(slug), getAuthTenantPublic(slug)]);
  if (!profile) notFound();
  const name = profile.name || profile.slug;
  const color = profile.metadata?.brand_primary_color || accountColor;
  const back = resolvePublicLink({ slug: profile.slug, businessType: profile.business_type, auth });

  return (
    <div className="pp-scope app-surface relative min-h-dvh">
      <style>{brandCss(color, ".pp-scope")}</style>
      <AppCanvas />
      <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
        <h1 className="font-display text-3xl font-semibold tracking-tight">Share your experience with {name}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A few honest words help other people choose. {name} reads every testimonial before deciding whether to share it.
        </p>
        <div className="mt-8">
          <TestimonialForm slug={profile.slug} businessName={name} />
        </div>
        {back && (
          <p className="mt-6 text-center text-sm">
            <a href={back.href} className="text-primary underline-offset-4 hover:underline">
              Visit {name}
            </a>
          </p>
        )}
        {!profile.white_label && (
          <div className="mt-10">
            <PoweredByBadge />
          </div>
        )}
      </main>
    </div>
  );
}
