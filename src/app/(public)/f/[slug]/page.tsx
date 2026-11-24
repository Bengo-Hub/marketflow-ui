import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { ArrowUp, Check, Handshake, ShoppingBag, Star } from "lucide-react";
import { BookingWidget } from "@/components/booking/booking-widget";
import { PoweredByBadge } from "@/components/powered-by";
import { AppCanvas } from "@/components/ui-kit";
import { WhatsAppIcon } from "@/components/public-profile/whatsapp-icon";
import { flpJoinUrl, flpShopUrl, safeUrl, whatsAppLink } from "@/components/public-profile/links";
import { getPublicFunnel, getPublicProfile, getPublicTestimonials, getTenantBrandColor, type PublicProfile } from "@/lib/api/public";
import { brandCss } from "@/lib/brand";
import { funnelUrl } from "@/lib/urls";
import { AB_HEADER, applyVariant, parseBucket, variantFor } from "@/lib/funnel-ab";
import { DOMAIN_TENANT_HEADER, domainAllows } from "@/lib/tenant-domains";
import { FunnelForm } from "./funnel-form";
import { blockType, primaryStepIndex, splitBenefits, starCount } from "./layout-plan";
import { StepView } from "./step-view";
import { StickyCta } from "./sticky-cta";
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
  const raw = await getPublicFunnel<PublicFunnel>(slug);
  if (!raw) notFound();
  const reqHeaders = await headers();
  // On a business's own domain only its own funnels are shown (proxy.ts sets the header).
  if (!domainAllows(reqHeaders.get(DOMAIN_TENANT_HEADER), raw.tenant_slug)) notFound();
  // The version this visitor sees (Sprint 7 #53); proxy.ts gives each visitor a bucket.
  const variant = variantFor(raw.ab_test, parseBucket(reqHeaders.get(AB_HEADER)));
  const f = applyVariant(raw, variant);
  const tested = f.ab_test ? variant : undefined;

  // Custom HTML from the funnel editor (sanitised by the API on save and on read).
  if (f.landing_page_html && f.landing_page_html.trim()) {
    return (
      <div className="min-h-dvh bg-background">
        <div className="mx-auto max-w-5xl px-4 py-10" dangerouslySetInnerHTML={{ __html: f.landing_page_html }} />
      </div>
    );
  }

  const [profile, accountColor, testimonials] = await Promise.all([
    getPublicProfile(f.tenant_slug),
    getTenantBrandColor(f.tenant_slug),
    getPublicTestimonials(f.tenant_slug, 3),
  ]);
  const steps = f.steps ?? [];
  const hero = safeUrl(f.hero_image_url);
  // The business logo next to its name (Sprint 7 #46).
  const logo = safeUrl(profile?.metadata?.logo_url);
  const businessName = profile?.name;

  // One main call to action: the first form (or action block) sits beside the headline and a
  // phone-width bar keeps it in reach; the other steps follow in their saved order.
  const primary = primaryStepIndex(steps);
  const defaultForm = steps.length === 0;
  const hasPrimary = primary >= 0 || defaultForm;
  const primaryLabel = defaultForm ? "Get in touch" : primary >= 0 ? ctaLabel(steps[primary]) : "";
  const rest = steps.map((step, i) => ({ step, i })).filter(({ i }) => i !== primary);
  const { intro, benefits } = splitBenefits(f.description);
  const rated = testimonials.filter((t) => starCount(t.rating) > 0);
  const average = rated.length ? rated.reduce((s, t) => s + starCount(t.rating), 0) / rated.length : 0;

  return (
    <div className="fn-scope app-surface relative min-h-dvh">
      <style>{brandCss(f.brand_color || profile?.metadata?.brand_primary_color || accountColor, ".fn-scope")}</style>
      <AppCanvas />
      {(logo || businessName) && (
        <header className="mx-auto flex max-w-6xl items-center gap-3 px-4 pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-6">
          {logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt={businessName ? `${businessName} logo` : ""} className="h-10 w-10 rounded-xl bg-white object-cover shadow-soft" />
          )}
          {businessName && <p className="truncate text-sm font-semibold">{businessName}</p>}
        </header>
      )}

      <main id="main" className="mx-auto max-w-6xl px-4 pb-28 sm:px-6 md:pb-16">
        <section
          aria-labelledby="funnel-title"
          className={`grid gap-8 pt-8 md:pt-14 ${hasPrimary ? "lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-x-14" : "mx-auto max-w-3xl text-center"}`}
        >
          <div className="space-y-6">
            <h1 id="funnel-title" className="text-balance font-display text-[2.15rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              {f.headline || f.name}
            </h1>
            {f.subheadline && <p className="text-pretty text-lg leading-relaxed text-muted-foreground sm:text-xl">{f.subheadline}</p>}
            {intro && <p className="text-pretty text-[15px] leading-relaxed text-muted-foreground">{intro}</p>}
            {benefits.length > 0 && (
              <ul className={`space-y-3 ${hasPrimary ? "" : "mx-auto inline-block text-left"}`}>
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3 text-[15px] leading-snug">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
                      <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden />
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            )}
            {testimonials.length > 0 && (
              <a href="#reviews" className={`group flex items-center gap-3 text-sm ${hasPrimary ? "" : "justify-center"}`}>
                <span className="flex -space-x-2" aria-hidden>
                  {testimonials.map((t) => (
                    <span key={t.id} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-primary/15 text-xs font-semibold text-primary">
                      {t.author_name.charAt(0).toUpperCase()}
                    </span>
                  ))}
                </span>
                <span className="text-muted-foreground group-hover:text-foreground">
                  {rated.length > 0 && (
                    <span className="mr-1.5 inline-flex items-center gap-1 font-semibold text-foreground">
                      <Star className="h-4 w-4 text-warning" fill="currentColor" aria-hidden />
                      {average.toFixed(1)}
                    </span>
                  )}
                  See what customers say
                </span>
              </a>
            )}
          </div>

          {hasPrimary && (
            <div className="lg:sticky lg:top-6 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:self-start">
              {defaultForm ? (
                <FunnelForm
                  id={PRIMARY_ID}
                  prominent
                  businessName={businessName}
                  tenantSlug={f.tenant_slug}
                  funnelSlug={f.slug}
                  variant={tested}
                  title="Leave your details"
                  ctaText={primaryLabel}
                  fields={[
                    { key: "first_name", label: "Name", required: true },
                    { key: "phone", label: "Phone or WhatsApp", type: "tel", required: true },
                    { key: "email", label: "Email", type: "email" },
                    { key: "interest", label: "What are you interested in?", type: "textarea" },
                  ]}
                />
              ) : (
                <StepView funnelSlug={f.slug} index={primary} variant={tested}>
                  <Block step={steps[primary]} funnel={f} profile={profile} variant={tested} anchorId={PRIMARY_ID} prominent />
                </StepView>
              )}
            </div>
          )}

          {hero && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={hero} alt="" className="aspect-[4/3] w-full rounded-[1.5rem] object-cover shadow-soft sm:aspect-video lg:col-start-1" />
          )}
        </section>

        {testimonials.length > 0 && (
          <section id="reviews" aria-labelledby="reviews-title" className="scroll-mt-6 pt-16">
            <h2 id="reviews-title" className="text-center font-display text-2xl font-semibold tracking-tight sm:text-3xl">What customers say</h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {testimonials.map((t) => (
                <figure key={t.id} className="glass flex flex-col rounded-[1.25rem] p-5">
                  {starCount(t.rating) > 0 && (
                    <div className="flex gap-0.5 text-warning" role="img" aria-label={`${starCount(t.rating)} out of 5`}>
                      {Array.from({ length: starCount(t.rating) }).map((_, i) => (
                        <Star key={i} className="h-4 w-4" fill="currentColor" aria-hidden />
                      ))}
                    </div>
                  )}
                  <blockquote className="mt-3 flex-1 text-[15px] leading-relaxed">&ldquo;{t.body}&rdquo;</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary" aria-hidden>
                      {t.author_name.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{t.author_name}</span>
                      {t.author_role && <span className="block text-xs text-muted-foreground">{t.author_role}</span>}
                    </span>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {rest.length > 0 && (
          <div className="mx-auto max-w-3xl space-y-6 pt-16">
            {rest.map(({ step, i }) => (
              <StepView key={step.id ?? `step-${i}`} funnelSlug={f.slug} index={i} variant={tested}>
                <Block step={step} funnel={f} profile={profile} variant={tested} />
              </StepView>
            ))}
          </div>
        )}

        {hasPrimary && (rest.length > 0 || testimonials.length > 0) && (
          <section className="mx-auto mt-16 max-w-3xl rounded-[1.5rem] bg-primary px-6 py-10 text-center text-primary-foreground shadow-soft sm:px-10">
            <p className="text-balance font-display text-2xl font-semibold tracking-tight sm:text-3xl">{f.headline || f.name}</p>
            <a
              href={`#${PRIMARY_ID}`}
              className="mt-6 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-background px-7 text-base font-semibold text-foreground transition-opacity hover:opacity-90"
            >
              {primaryLabel}
              <ArrowUp className="h-4 w-4" aria-hidden />
            </a>
          </section>
        )}
      </main>
      <footer className="flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+6rem)] md:pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        {/* White label (Business plan) hides the badge. */}
        {!profile?.white_label && <PoweredByBadge />}
      </footer>
      {hasPrimary && <StickyCta targetId={PRIMARY_ID} label={primaryLabel} />}
    </div>
  );
}

/** The anchor of the page's main call to action. */
const PRIMARY_ID = "get-started";

/** The words on the main call to action, from the step or its type. */
function ctaLabel(step: FunnelStep): string {
  if (step.cta_text) return step.cta_text;
  switch (blockType(step)) {
    case "whatsapp":
      return "Chat on WhatsApp";
    case "google_calendar":
      return "Book a time";
    case "product":
      return "Buy now";
    case "recruit":
      return "Join my team";
    default:
      return "Send";
  }
}

const btn = "inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark";

function Block({
  step,
  funnel,
  profile,
  variant,
  anchorId,
  prominent = false,
}: {
  step: FunnelStep;
  funnel: PublicFunnel;
  profile: PublicProfile | null;
  variant?: "a" | "b";
  /** Set on the page's main call to action, so the sticky bar can scroll to it. */
  anchorId?: string;
  prominent?: boolean;
}) {
  const type = blockType(step);
  const card = prominent
    ? "scroll-mt-6 rounded-[1.5rem] border border-border/70 bg-card p-5 shadow-soft ring-1 ring-primary/10 sm:p-7"
    : "glass scroll-mt-6 rounded-[1.5rem] p-6 sm:p-8";
  const wide = prominent ? "w-full justify-center min-h-12 text-base" : "";

  if (type === "form") {
    return (
      <FunnelForm
        id={anchorId}
        prominent={prominent}
        businessName={profile?.name}
        tenantSlug={funnel.tenant_slug}
        funnelSlug={funnel.slug}
        variant={variant}
        title={step.title}
        description={step.description}
        ctaText={step.cta_text}
        fields={step.fields ?? []}
      />
    );
  }

  if (type === "google_calendar") {
    return (
      <section id={anchorId} className={prominent ? card : "scroll-mt-6 space-y-4"}>
        {step.title && <h2 className="font-display text-xl font-semibold">{step.title}</h2>}
        {step.description && <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>}
        <div className={prominent ? "mt-4" : ""}>
          <BookingWidget tenantSlug={funnel.tenant_slug} />
        </div>
      </section>
    );
  }

  let action: React.ReactNode = null;
  if (type === "whatsapp" && profile) {
    const href = whatsAppLink(profile.whatsapp_number, step.whatsapp_message || `Hi ${profile.name}, I'm interested in learning more.`);
    if (href) {
      action = (
        <a href={href} target="_blank" rel="noreferrer" className={`${btn} ${wide}`}>
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
      <section id={anchorId} className={`${card} flex flex-col gap-5 ${prominent ? "" : "sm:flex-row sm:items-center"}`}>
        {img && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt={step.product_name ?? ""}
            className={`${prominent ? "mx-auto h-48 w-48" : "h-40 w-40"} shrink-0 rounded-2xl bg-background/60 object-contain p-2`}
          />
        )}
        <div className="min-w-0">
          <h2 className="font-display text-xl font-semibold">{step.product_name || step.title || "Featured product"}</h2>
          {step.description && <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>}
          <p className="mt-2 text-sm font-semibold tabular">
            {[step.product_price, step.product_cc ? `CC ${step.product_cc}` : ""].filter(Boolean).join("   ")}
          </p>
          {href && (
            <a href={href} target="_blank" rel="noreferrer" className={`${btn} ${wide} mt-4`}>
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
        <a href={href} target="_blank" rel="noreferrer" className={`${btn} ${wide}`}>
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
    <section id={anchorId} className={card}>
      {step.title && <h2 className="font-display text-xl font-semibold">{step.title}</h2>}
      {step.description && <p className="mt-2 whitespace-pre-line text-[15px] leading-relaxed text-muted-foreground">{step.description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </section>
  );
}
