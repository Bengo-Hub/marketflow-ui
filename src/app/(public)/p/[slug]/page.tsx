import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, Mail, ShoppingBag, Star } from "lucide-react";
import { PoweredByBadge } from "@/components/powered-by";
import { BookingWidget } from "@/components/booking/booking-widget";
import { AppCanvas } from "@/components/ui-kit";
import { FlpOpportunity } from "@/components/public-profile/flp-sections";
import { ProfileAvatar } from "@/components/public-profile/profile-avatar";
import { ProfileTracker } from "@/components/public-profile/profile-tracker";
import { VideoFacade } from "@/components/public-profile/video-facade";
import { WhatsAppIcon } from "@/components/public-profile/whatsapp-icon";
import { flpJoinUrl, flpShopUrl, jsonLd, offeringHref, safeUrl, videoEmbed, whatsAppLink } from "@/components/public-profile/links";
import { getPublicProfile, getPublicTestimonials, getTenantBrandColor, type Offering, type PublicProfile } from "@/lib/api/public";
import { brandCss } from "@/lib/brand";
import { APP_URL, publicProfileUrl } from "@/lib/urls";

const AI_URL = process.env.NEXT_PUBLIC_AI_API_URL || "https://marketflowai.codevertexafrica.com";
const FLP_COVER = "/images/public-profile/aloe-farm.jpg";

function view(p: PublicProfile) {
  const m = p.metadata ?? {};
  const isFLP = p.business_type === "flp";
  const name = p.name || p.slug;
  return {
    m,
    isFLP,
    name,
    tagline: m.tagline || (isFLP ? "Forever Business Owner" : ""),
    bio: m.bio || "",
    cover: safeUrl(m.cover_url) ?? (isFLP ? FLP_COVER : null),
    logo: safeUrl(m.logo_url),
    shop: isFLP ? flpShopUrl(p) : null,
    join: isFLP ? flpJoinUrl(p) : null,
    wa: whatsAppLink(p.whatsapp_number, `Hi ${name}, I found your page and I'm interested.`),
    email: typeof m.contact_email === "string" && m.contact_email.includes("@") ? m.contact_email : null,
    video: videoEmbed(m.video_url),
    offerings: (Array.isArray(m.offerings) ? m.offerings : []).filter((o: Offering) => o && o.name && !o.hidden),
    booking: m.booking_enabled !== false,
  };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getPublicProfile(slug);
  if (!p) return { title: "Page not found" };
  const v = view(p);
  const title = v.tagline ? `${v.name}: ${v.tagline}` : v.name;
  const url = publicProfileUrl(p.slug);
  return {
    title,
    description: v.bio || undefined,
    alternates: { canonical: url },
    openGraph: { title, description: v.bio || undefined, url, type: "profile", images: v.cover ? [v.cover.startsWith("/") ? `${APP_URL}${v.cover}` : v.cover] : undefined },
  };
}

export default async function PublicProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [profile, testimonials, accountColor] = await Promise.all([getPublicProfile(slug), getPublicTestimonials(slug), getTenantBrandColor(slug)]);
  if (!profile) notFound();
  const v = view(profile);
  // The page colour set on the profile wins, then the tenant's SSO brand colour, then Codevertex purple.
  const color = v.m.brand_primary_color || accountColor;
  const contactTitle = v.isFLP ? "Talk to me about Forever" : `Get in touch with ${v.name}`;

  return (
    <div className="pp-scope app-surface relative min-h-dvh">
      {/* The tenant's colour, validated in brandCss, scoped to this page. */}
      <style>{brandCss(color, ".pp-scope")}</style>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": v.isFLP ? "Person" : "LocalBusiness",
            name: v.name,
            description: v.bio || undefined,
            url: publicProfileUrl(profile.slug),
            ...(v.isFLP && v.tagline ? { jobTitle: v.tagline } : {}),
          }),
        }}
      />
      <AppCanvas />
      <ProfileTracker slug={profile.slug} />

      {/* Hero */}
      <header className="relative">
        {v.cover && (
          <div className="absolute inset-x-0 top-0 h-[22rem] overflow-hidden sm:h-[26rem]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={v.cover} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/35" />
          </div>
        )}
        <div className="relative mx-auto max-w-5xl px-4 pt-[calc(env(safe-area-inset-top)+3.5rem)] sm:px-6 sm:pt-24">
          <div className="glass-strong mx-auto max-w-2xl rounded-[1.75rem] p-6 text-center sm:p-8">
            <ProfileAvatar src={v.logo} name={v.name} />
            <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">{v.name}</h1>
            {v.tagline && <p className="mt-1 text-base font-medium text-primary">{v.tagline}</p>}
            {v.bio && <p className="mx-auto mt-3 max-w-prose text-[15px] leading-relaxed text-muted-foreground">{v.bio}</p>}
            <div className="mt-6 flex flex-wrap justify-center gap-2.5">
              {v.wa && (
                <a href={v.wa} target="_blank" rel="noreferrer" data-track="whatsapp_click" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary-dark">
                  <WhatsAppIcon className="h-4 w-4" />
                  Chat on WhatsApp
                </a>
              )}
              {!v.wa && v.email && (
                <a href={`mailto:${v.email}`} data-track="cta_click" data-track-meta='{"cta":"email"}' className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-soft hover:bg-primary-dark">
                  <Mail className="h-4 w-4" />
                  Email me
                </a>
              )}
              {v.booking && (
                <a href="#booking" data-track="book_click" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/70 px-5 text-sm font-semibold hover:border-primary/50">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  Book a call
                </a>
              )}
              {v.shop && (
                <a href={v.shop} target="_blank" rel="noreferrer" data-track="product_click" data-track-meta='{"cta":"shop"}' className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/70 px-5 text-sm font-semibold hover:border-primary/50">
                  <ShoppingBag className="h-4 w-4 text-primary" />
                  Shop online
                </a>
              )}
            </div>
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto max-w-5xl space-y-16 px-4 py-14 sm:px-6">
        {v.offerings.length > 0 && (
          <section aria-labelledby="offerings">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 id="offerings" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                  {v.isFLP ? "Featured products" : "Products and services"}
                </h2>
                {v.isFLP && v.shop && <p className="mt-1 text-sm text-muted-foreground">Each product opens in my Forever shop.</p>}
              </div>
              {v.shop && (
                <a href={v.shop} target="_blank" rel="noreferrer" data-track="product_click" data-track-meta='{"cta":"all_products"}' className="text-sm font-semibold text-primary hover:underline">
                  View all products
                </a>
              )}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {v.offerings.map((o, i) => (
                <OfferingCard key={`${o.name}-${i}`} offering={o} href={offeringHref(o, v.shop)} />
              ))}
            </div>
          </section>
        )}

        {(v.m.story || v.video) && (
          <section aria-labelledby="story" className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 id="story" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">
                {v.isFLP ? "The Forever story" : `About ${v.name}`}
              </h2>
              {v.m.story && (
                <div className="mt-3 space-y-3 text-[15px] leading-relaxed text-muted-foreground">
                  {v.m.story.split(/\n\s*\n/).map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </div>
              )}
            </div>
            {v.video && <VideoFacade src={v.video.src} thumb={v.video.thumb} title={v.isFLP ? "The Forever story" : `About ${v.name}`} />}
          </section>
        )}

        {v.isFLP && <FlpOpportunity text={v.m.opportunity_text} joinUrl={v.join} />}

        {testimonials.length > 0 && (
          <section aria-labelledby="testimonials">
            <h2 id="testimonials" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">What people say</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {testimonials.map((t) => (
                <figure key={t.id} className="glass rounded-[1.25rem] p-5">
                  <div className="flex gap-0.5 text-warning" aria-label={`${t.rating} out of 5`}>
                    {Array.from({ length: Math.max(0, Math.min(5, t.rating)) }).map((_, i) => (
                      <Star key={i} className="h-4 w-4" fill="currentColor" />
                    ))}
                  </div>
                  <blockquote className="mt-3 text-[15px] leading-relaxed">&ldquo;{t.body}&rdquo;</blockquote>
                  <figcaption className="mt-4 flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-sm font-semibold text-primary">
                      {t.author_name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold">{t.author_name}</p>
                      {t.author_role && <p className="text-xs text-muted-foreground">{t.author_role}</p>}
                    </div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {v.booking && (
          <section id="booking" aria-labelledby="booking-title" className="scroll-mt-6">
            <h2 id="booking-title" className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">Book a call with {v.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">A short, free introduction call. Pick a time that suits you.</p>
            <div className="mt-6">
              <BookingWidget tenantSlug={profile.slug} />
            </div>
          </section>
        )}

        {(v.wa || v.email) && (
          <section className="rounded-[1.75rem] bg-primary px-6 py-10 text-primary-foreground sm:px-10">
            <h2 className="font-display text-2xl font-semibold tracking-tight sm:text-3xl">{contactTitle}</h2>
            <p className="mt-2 max-w-xl opacity-90">Send a message and I will get back to you, or ask the assistant in the corner of this page.</p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              {v.wa && (
                <a href={v.wa} target="_blank" rel="noreferrer" data-track="whatsapp_click" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-primary">
                  <WhatsAppIcon className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
              {v.email && (
                <a href={`mailto:${v.email}`} data-track="cta_click" data-track-meta='{"cta":"email"}' className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/40 px-5 text-sm font-semibold hover:bg-white/10">
                  <Mail className="h-4 w-4" />
                  Email
                </a>
              )}
            </div>
          </section>
        )}
      </main>

      <footer className="flex justify-center px-4 pb-[calc(env(safe-area-inset-bottom)+2rem)]">
        <PoweredByBadge />
      </footer>

      {/* The chat assistant is scoped to this tenant; the persona is fixed per business type on the server side. */}
      <script
        async
        src="/widget/chat.js"
        data-tenant={profile.slug}
        data-api-url={AI_URL}
        data-mode="tenant"
        data-widget-title="Vera"
        data-primary-color={/^#[0-9a-f]{6}$/i.test(color ?? "") ? color! : "#9100B0"}
        data-business-type={v.isFLP ? "flp" : "marketflow-crm"}
        data-persona={v.isFLP ? "flp-fbo" : "marketflow-crm"}
        data-subtitle={v.name}
        data-whatsapp={v.wa ? (profile.whatsapp_number ?? "").replace(/\D/g, "") : undefined}
        data-email={v.email ?? undefined}
      />
    </div>
  );
}

function OfferingCard({ offering: o, href }: { offering: Offering; href: string | null }) {
  const img = safeUrl(o.image_url);
  const body = (
    <>
      <div className="flex h-40 items-center justify-center bg-background/60 p-4 sm:h-44">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt={o.name} loading="lazy" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-[1.03] motion-reduce:transform-none" />
        ) : (
          <ShoppingBag className="h-10 w-10 text-primary/40" />
        )}
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-[15px] font-semibold leading-snug">{o.name}</h3>
        {o.description && <p className="mt-1 line-clamp-3 text-sm text-muted-foreground">{o.description}</p>}
        <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-sm">
          <span className="font-semibold tabular">{o.price_label ?? (o.cc ? `CC ${o.cc}` : "")}</span>
          {href && <span className="font-semibold text-primary">{o.flp_item_code ? "Shop" : "View"}</span>}
        </div>
      </div>
    </>
  );
  const cls = "glass group flex flex-col overflow-hidden rounded-[1.25rem]";
  if (!href) return <article className={cls}>{body}</article>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      data-track="product_click"
      data-track-meta={JSON.stringify({ item: o.flp_item_code ?? o.name })}
      className={`${cls} transition-transform hover:-translate-y-0.5 motion-reduce:transform-none`}
    >
      {body}
    </a>
  );
}
