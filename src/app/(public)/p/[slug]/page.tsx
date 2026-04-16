import type { Metadata } from "next";
import { notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://marketflowapi.codevertexitsolutions.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://marketflow.codevertexitsolutions.com";

type Profile = {
  id: string;
  name: string;
  slug: string;
  business_type?: string;
  country?: string;
  whatsapp_number?: string;
  fbo_distrib_id?: string;
  flp_store_code?: string;
  flp_language?: string;
  metadata?: {
    bio?: string;
    logo_url?: string;
    brand_primary_color?: string;
    tagline?: string;
  };
};

async function getProfile(slug: string): Promise<Profile | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/profile/${slug}`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

type Testimonial = {
  id: string;
  author_name: string;
  author_role?: string;
  body: string;
  avatar_url?: string;
  rating: number;
};

async function getTestimonials(slug: string): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/profile/${slug}/testimonials?limit=10`, {
      next: { revalidate: 300 },
    });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch {
    return [];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) {
    return { title: "Profile not found" };
  }
  const name = profile.name || slug;
  const tagline = profile.metadata?.tagline ?? "Forever Living Business Owner";
  const bio =
    profile.metadata?.bio ??
    `Shop pure aloe vera products and start your own Forever business with ${name}. Over 46 years of health and wellness in 160+ countries.`;
  const image =
    profile.metadata?.logo_url ||
    `${APP_URL}/api/og?title=${encodeURIComponent(name)}&subtitle=${encodeURIComponent(tagline)}`;
  const canonical = `${APP_URL}/p/${profile.slug}`;
  return {
    title: `${name} — ${tagline}`,
    description: bio,
    alternates: { canonical },
    openGraph: {
      type: "profile",
      title: `${name} — ${tagline}`,
      description: bio,
      url: canonical,
      siteName: "MarketFlow",
      images: [{ url: image, width: 1200, height: 630, alt: name }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — ${tagline}`,
      description: bio,
      images: [image],
    },
  };
}

export default async function FBOProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [profile, testimonials] = await Promise.all([
    getProfile(slug),
    getTestimonials(slug),
  ]);
  if (!profile) notFound();

  const name = profile.name || slug;
  const brandColor = profile.metadata?.brand_primary_color || "#f59e0b";
  const tagline = profile.metadata?.tagline ?? "Forever Business Owner";
  const bio = profile.metadata?.bio;
  const calcomUsername = (profile.metadata as Record<string, string> | undefined)?.calcom_username;
  const calcomEvent = (profile.metadata as Record<string, string> | undefined)?.calcom_event ?? "15min";

  // JSON-LD structured data: Person + Organization so search engines understand
  // both the FBO and the hosted brand.
  const ldPerson = {
    "@context": "https://schema.org",
    "@type": "Person",
    name,
    jobTitle: tagline,
    worksFor: {
      "@type": "Organization",
      name: "Forever Living Products",
      url: "https://foreverliving.com",
    },
    url: `${APP_URL}/p/${profile.slug}`,
    ...(profile.whatsapp_number && {
      contactPoint: {
        "@type": "ContactPoint",
        contactType: "sales",
        telephone: profile.whatsapp_number,
      },
    }),
    ...(profile.country && { address: { "@type": "PostalAddress", addressCountry: profile.country } }),
    ...(bio && { description: bio }),
  };
  const ldWebsite = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    url: `${APP_URL}/p/${profile.slug}`,
    name: `${name} — ${tagline}`,
    publisher: { "@type": "Organization", name: "Codevertex Africa Ltd" },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* SEO structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldPerson) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldWebsite) }}
      />

      {/* Hero */}
      <div
        className="py-16"
        style={{ background: `linear-gradient(180deg, ${brandColor}33 0%, transparent 100%)` }}
      >
        <div className="container mx-auto px-4 text-center">
          {profile.metadata?.logo_url ? (
            <img
              src={profile.metadata.logo_url}
              alt={`${name} logo`}
              className="mx-auto mb-4 h-20 w-20 rounded-full object-cover"
            />
          ) : (
            <div
              className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-black"
              style={{ background: brandColor }}
            >
              {name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="mb-2 text-3xl font-bold">{name}</h1>
          <p className="text-muted-foreground">{tagline}</p>
          {bio && <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">{bio}</p>}
          {profile.whatsapp_number && (
            <a
              href={`https://wa.me/${profile.whatsapp_number.replace(/[^0-9]/g, "")}?text=Hi%20I%27m%20interested%20in%20your%20products`}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-green-500 px-6 py-2 text-white hover:bg-green-600"
              target="_blank"
              rel="noopener noreferrer"
            >
              Chat on WhatsApp
            </a>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto max-w-3xl px-4 py-12 text-center">
        <h2 className="mb-6 text-2xl font-bold">Forever Living Products</h2>
        <p className="mb-8 text-muted-foreground">
          Discover the power of pure aloe vera. Over 46 years of health and wellness, operating
          in 160+ countries worldwide.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {profile.fbo_distrib_id && (
            <a
              href={`https://shop.foreverliving.com/retail/entry/Shop.do?store=${profile.flp_store_code || "KEN"}&language=${profile.flp_language || "en"}&distribID=${profile.fbo_distrib_id}`}
              className="block rounded-lg border p-6 transition-colors hover:border-[var(--brand-primary)]"
              target="_blank"
              rel="noopener noreferrer"
            >
              <h3 className="mb-1 font-semibold">Shop Products</h3>
              <p className="text-sm text-muted-foreground">Browse the full product catalog</p>
            </a>
          )}
          <a
            href={`https://join.foreverliving.com/marketing/joinnow/applicationForm.do?action=display&store=${profile.flp_store_code || "KEN"}&distribID=${profile.fbo_distrib_id || ""}&menuoff=n&langID=${profile.flp_language || "en"}`}
            className="block rounded-lg border p-6 transition-colors hover:border-[var(--brand-primary)]"
            target="_blank"
            rel="noopener noreferrer"
          >
            <h3 className="mb-1 font-semibold">Join My Team</h3>
            <p className="text-sm text-muted-foreground">Start your own FBO business</p>
          </a>
        </div>
      </div>

      {testimonials.length > 0 && (
        <section className="container mx-auto max-w-4xl px-4 py-12">
          <h2 className="mb-6 text-center text-2xl font-bold">What people are saying</h2>
          <div className="grid gap-4 md:grid-cols-2">
            {testimonials.map((t) => (
              <figure
                key={t.id}
                className="rounded-2xl border bg-card p-6 shadow-sm"
              >
                <blockquote className="text-sm leading-relaxed text-foreground">
                  &ldquo;{t.body}&rdquo;
                </blockquote>
                <figcaption className="mt-4 flex items-center gap-3">
                  {t.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={t.avatar_url}
                      alt={t.author_name}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white"
                      style={{ background: brandColor }}
                    >
                      {t.author_name.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div>
                    <div className="text-sm font-semibold">{t.author_name}</div>
                    {t.author_role && (
                      <div className="text-xs text-muted-foreground">{t.author_role}</div>
                    )}
                  </div>
                  <div className="ml-auto text-xs text-amber-500" aria-label={`${t.rating} out of 5 stars`}>
                    {"★".repeat(t.rating)}
                    <span className="text-slate-300">{"★".repeat(5 - t.rating)}</span>
                  </div>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      {calcomUsername && (
        <section className="container mx-auto max-w-4xl px-4 py-12">
          <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
            <div className="border-b px-6 py-4">
              <h2 className="text-2xl font-bold">Book a call with {name}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Pick a time that works for you — free 15-minute intro call.
              </p>
            </div>
            <iframe
              src={`https://calendar.codevertexitsolutions.com/${calcomUsername}/${calcomEvent}`}
              className="h-[620px] w-full"
              title="Book a meeting"
              loading="lazy"
            />
          </div>
        </section>
      )}

      {/* Embeddable chat widget — injected on all public FBO pages */}
      <script
        async
        src="/widget/chat.js"
        data-tenant={profile.slug}
        data-api-url={API_URL}
      />

      {/* Visitor analytics: fire-and-forget page-view beacon to profile-events.
          Intercept CTA clicks so we can track cta_click / whatsapp_click /
          book_click without React Server Component roundtrips. */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
(function(){
  try {
    var slug = ${JSON.stringify(profile.slug)};
    var api = ${JSON.stringify(API_URL)};
    var send = function(type, meta){
      try {
        fetch(api + '/api/v1/public/profile-events', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({slug: slug, event_type: type, referrer: document.referrer, metadata: meta||{}}),
          keepalive: true
        }).catch(function(){});
      } catch(e) {}
    };
    send('page_view');
    document.addEventListener('click', function(e){
      var el = e.target;
      while (el && el.nodeType === 1) {
        var href = el.getAttribute && el.getAttribute('href');
        if (href) {
          if (/^https:\\/\\/wa\\.me/.test(href)) return send('whatsapp_click');
          if (/cal(endar)?\\./.test(href)) return send('book_click');
          if (/shop\\.foreverliving\\.com/.test(href)) return send('product_click', {href: href});
          if (/join\\.foreverliving\\.com/.test(href)) return send('cta_click', {cta: 'join'});
        }
        el = el.parentNode;
      }
    }, true);
  } catch(e) {}
})();
          `.trim(),
        }}
      />

      <footer className="border-t py-6 text-center text-sm text-muted-foreground">
        <p>Powered by Codevertex Africa Ltd</p>
      </footer>
    </div>
  );
}
