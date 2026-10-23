import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Handshake, ShoppingBag } from "lucide-react";
import { BookingWidget } from "@/components/booking/booking-widget";
import { PoweredByBadge } from "@/components/powered-by";
import { AppCanvas } from "@/components/ui-kit";
import { WhatsAppIcon } from "@/components/public-profile/whatsapp-icon";
import { flpJoinUrl, flpShopUrl, safeUrl, whatsAppLink } from "@/components/public-profile/links";
import { getPublicFunnel, getPublicProfile, getTenantBrandColor, type PublicProfile } from "@/lib/api/public";
import { brandCss } from "@/lib/brand";
import { funnelUrl } from "@/lib/urls";
import { FunnelForm } from "./funnel-form";
import { StepView } from "./step-view";
import type { FunnelStep, PublicFunnel } from "./types";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const f = await getPublicFunnel<PublicFunnel>(slug);
  if (!f) return { title: "Page not found" };
  const title = f.headline || f.name;
  const description = f.subheadline || f.description || undefined;
  return { title, description, alternates: { canonical: funnelUrl(f.slug) }, openGraph: { title, description, url: funnelUrl(f.slug) } };
}

export default async function PublicFunnelPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const f = await getPublicFunnel<PublicFunnel>(slug);
  if (!f) notFound();

  // Custom HTML from the funnel editor (sanitised by the API on save and on read).
  if (f.landing_page_html && f.landing_page_html.trim()) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto max-w-5xl px-4 py-10" dangerouslySetInnerHTML={{ __html: f.landing_page_html }} />
      </div>
    );
  }

  const [profile, accountColor] = await Promise.all([getPublicProfile(f.tenant_slug), getTenantBrandColor(f.tenant_slug)]);
  const steps = f.steps ?? [];
  const hero = safeUrl(f.hero_image_url);

  return (
    <div className="fn-scope app-surface relative min-h-dvh">
      <style>{brandCss(f.brand_color || profile?.metadata?.brand_primary_color || accountColor, ".fn-scope")}</style>
      <AppCanvas />
      <main id="main" className="mx-auto max-w-3xl space-y-6 px-4 pb-16 pt-[calc(env(safe-area-inset-top)+3rem)] sm:px-6 md:pt-20">
        <header className="text-center">
          {profile && <p className="text-sm font-semibold text-primary">{profile.name}</p>}
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight sm:text-5xl">{f.headline || f.name}</h1>
          {f.subheadline && <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">{f.subheadline}</p>}
        </header>

        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero} alt="" className="w-full rounded-[1.5rem] object-cover shadow-soft" />
        )}

        {steps.map((step, i) => (
          <StepView key={step.id ?? `step-${i}`} funnelSlug={f.slug} index={i}>
            <Block step={step} funnel={f} profile={profile} />
          </StepView>
        ))}

        {steps.length === 0 && (
          <FunnelForm
            tenantSlug={f.tenant_slug}
            funnelSlug={f.slug}
            title="Leave your details"
            fields={[
              { key: "first_name", label: "Name", required: true },
              { key: "phone", label: "Phone or WhatsApp", type: "tel", required: true },
              { key: "email", label: "Email", type: "email" },
              { key: "interest", label: "What are you interested in?", type: "textarea" },
            ]}
          />
        )}
      </main>
      <footer className="flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <PoweredByBadge />
      </footer>
    </div>
  );
}

const btn = "inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark";

function Block({ step, funnel, profile }: { step: FunnelStep; funnel: PublicFunnel; profile: PublicProfile | null }) {
  const type = step.block_type ?? ((step.fields?.length ?? 0) > 0 ? "form" : "content");

  if (type === "form") {
    return (
      <FunnelForm
        tenantSlug={funnel.tenant_slug}
        funnelSlug={funnel.slug}
        title={step.title}
        description={step.description}
        ctaText={step.cta_text}
        fields={step.fields ?? []}
      />
    );
  }

  if (type === "google_calendar") {
    return (
      <section className="space-y-4">
        {step.title && <h2 className="font-display text-xl font-semibold">{step.title}</h2>}
        {step.description && <p className="text-sm text-muted-foreground">{step.description}</p>}
        <BookingWidget tenantSlug={funnel.tenant_slug} />
      </section>
    );
  }

  let action: React.ReactNode = null;
  if (type === "whatsapp" && profile) {
    const href = whatsAppLink(profile.whatsapp_number, step.whatsapp_message || `Hi ${profile.name}, I'm interested in learning more.`);
    if (href) {
      action = (
        <a href={href} target="_blank" rel="noreferrer" className={btn}>
          <WhatsAppIcon className="h-4 w-4" />
          {step.cta_text || "Chat on WhatsApp"}
        </a>
      );
    }
  } else if (type === "product" && profile) {
    const shop = flpShopUrl(profile);
    const href = shop ? (step.product_code ? `${shop}&itemCode=${encodeURIComponent(step.product_code)}` : shop) : null;
    const img = safeUrl(step.product_image);
    return (
      <section className="glass flex flex-col gap-5 rounded-[1.5rem] p-6 sm:flex-row sm:items-center">
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={step.product_name ?? ""} className="h-40 w-40 shrink-0 rounded-2xl bg-background/60 object-contain p-2" />
        )}
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold">{step.product_name || step.title || "Featured product"}</h2>
          {step.description && <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>}
          <p className="mt-2 text-sm font-semibold tabular">
            {[step.product_price, step.product_cc ? `CC ${step.product_cc}` : ""].filter(Boolean).join("   ")}
          </p>
          {href && (
            <a href={href} target="_blank" rel="noreferrer" className={`${btn} mt-4`}>
              <ShoppingBag className="h-4 w-4" />
              {step.cta_text || "Buy now"}
            </a>
          )}
        </div>
      </section>
    );
  } else if (type === "recruit" && profile) {
    const href = flpJoinUrl(profile);
    if (href) {
      action = (
        <a href={href} target="_blank" rel="noreferrer" className={btn}>
          <Handshake className="h-4 w-4" />
          {step.cta_text || "Join my team"}
        </a>
      );
    }
  } else if (step.cta_text) {
    const href = safeUrl(step.cta_url);
    if (href) {
      action = (
        <a href={href} className={btn}>
          {step.cta_text}
        </a>
      );
    }
  }

  if (!step.title && !step.description && !action) return null;
  return (
    <section className="glass rounded-[1.5rem] p-6 sm:p-8">
      {step.title && <h2 className="font-display text-xl font-semibold">{step.title}</h2>}
      {step.description && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">{step.description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}
