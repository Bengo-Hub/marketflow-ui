import type { Metadata } from "next";
import { notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://marketflowapi.codevertexitsolutions.com";
const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || "https://marketflowai.codevertexitsolutions.com";
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
    cover_url?: string;
    brand_primary_color?: string;
    tagline?: string;
    video_url?: string;
    story?: string;
    calcom_username?: string;
    calcom_event?: string;
  };
};

type Testimonial = {
  id: string;
  author_name: string;
  author_role?: string;
  body: string;
  avatar_url?: string;
  rating: number;
};

async function getProfile(slug: string): Promise<Profile | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/profile/${slug}`, { next: { revalidate: 300 } });
    if (!res.ok) return null;
    return res.json();
  } catch { return null; }
}

async function getTestimonials(slug: string): Promise<Testimonial[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/profile/${slug}/testimonials?limit=10`, { next: { revalidate: 300 } });
    if (!res.ok) return [];
    const json = await res.json();
    return json.data ?? [];
  } catch { return []; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const profile = await getProfile(slug);
  if (!profile) return { title: "Profile not found" };
  const name = profile.name || slug;
  const tagline = profile.metadata?.tagline ?? "Business Owner";
  const bio = profile.metadata?.bio ?? `Explore products and opportunities with ${name}.`;
  const image = profile.metadata?.logo_url || `${APP_URL}/api/og?title=${encodeURIComponent(name)}&subtitle=${encodeURIComponent(tagline)}`;
  return {
    title: `${name} — ${tagline}`,
    description: bio,
    alternates: { canonical: `${APP_URL}/p/${profile.slug}` },
    openGraph: { title: `${name} — ${tagline}`, description: bio, url: `${APP_URL}/p/${profile.slug}`, type: "profile", images: [{ url: image, width: 1200, height: 630 }] },
  };
}

export default async function FBOProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [profile, testimonials] = await Promise.all([getProfile(slug), getTestimonials(slug)]);
  if (!profile) notFound();

  const name = profile.name || slug;
  const brandColor = profile.metadata?.brand_primary_color || "#f59e0b";
  const tagline = profile.metadata?.tagline ?? "Business Owner";
  const bio = profile.metadata?.bio;
  const story = profile.metadata?.story;
  const videoUrl = profile.metadata?.video_url;
  const coverUrl = profile.metadata?.cover_url;
  const calcomUsername = profile.metadata?.calcom_username;
  const calcomEvent = profile.metadata?.calcom_event ?? "15min";
  const isFLP = profile.business_type === "flp";
  const store = profile.flp_store_code || "KEN";
  const lang = profile.flp_language || "en";
  const did = profile.fbo_distrib_id || "";
  const shopLink = did ? `https://shop.foreverliving.com/retail/entry/Shop.do?store=${store}&language=${lang}&distribID=${did}` : "";
  const recruitLink = did ? `https://join.foreverliving.com/marketing/joinnow/applicationForm.do?action=display&store=${store}&distribID=${did}&menuoff=n&langID=${lang}` : "";
  const waDigits = (profile.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waLink = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi ${name}, I'm interested in learning more!`)}` : "";

  const ldPerson = {
    "@context": "https://schema.org", "@type": "Person", name, jobTitle: tagline,
    worksFor: { "@type": "Organization", name: isFLP ? "Forever Living Products" : name, url: isFLP ? "https://foreverliving.com" : `${APP_URL}/p/${profile.slug}` },
    url: `${APP_URL}/p/${profile.slug}`,
    ...(bio && { description: bio }),
    ...(profile.country && { address: { "@type": "PostalAddress", addressCountry: profile.country } }),
  };

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(ldPerson) }} />

      {/* ── Hero Banner ─────────────────────────────────────────── */}
      <div className="relative" style={{ background: coverUrl ? undefined : `linear-gradient(135deg, ${brandColor}40 0%, ${brandColor}15 50%, transparent 100%)` }}>
        {coverUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-30" />
        )}
        <div className="relative mx-auto max-w-4xl px-4 py-12 md:py-16">
          <div className="flex flex-col items-center gap-4 text-center md:flex-row md:items-start md:text-left md:gap-6">
            {/* Avatar */}
            {profile.metadata?.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={profile.metadata.logo_url} alt={name} className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-lg md:h-28 md:w-28" />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white text-3xl font-bold text-white shadow-lg md:h-28 md:w-28" style={{ background: brandColor }}>
                {name.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-2xl font-bold md:text-3xl">{name}</h1>
              <p className="text-muted-foreground">{tagline}</p>
              {bio && <p className="mt-2 max-w-lg text-sm text-muted-foreground leading-relaxed">{bio}</p>}
              <div className="mt-4 flex flex-wrap items-center justify-center gap-2 md:justify-start">
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1DA851] transition">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M20.52 3.45A11.84 11.84 0 0012.05 0C5.5 0 .2 5.31.2 11.87a11.8 11.8 0 001.6 5.94L0 24l6.33-1.75a11.85 11.85 0 005.72 1.46h.01c6.55 0 11.87-5.31 11.87-11.87a11.8 11.8 0 00-3.41-8.39z"/></svg>
                    WhatsApp
                  </a>
                )}
                {shopLink && (
                  <a href={shopLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted transition">
                    🛒 Shop Products
                  </a>
                )}
                {recruitLink && (
                  <a href={recruitLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium hover:bg-muted transition">
                    🤝 Join My Team
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4">
        {/* ── Video / Story Section ─────────────────────────────── */}
        {(videoUrl || story) && (
          <section className="py-8">
            <h2 className="mb-4 text-xl font-bold text-center">
              {isFLP ? "My Forever Story" : `About ${name}`}
            </h2>
            {videoUrl && (
              <div className="relative mx-auto mb-6 aspect-video max-w-2xl overflow-hidden rounded-2xl shadow-lg">
                <iframe src={videoUrl} className="absolute inset-0 h-full w-full" allow="autoplay; fullscreen" loading="lazy" title="Video" />
              </div>
            )}
            {story && (
              <p className="mx-auto max-w-2xl text-sm text-muted-foreground leading-relaxed text-center">{story}</p>
            )}
          </section>
        )}

        {/* ── Benefits / Why Section ────────────────────────────── */}
        {isFLP && (
          <section className="py-8 border-t">
            <h2 className="mb-6 text-xl font-bold text-center">Why Forever Living?</h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { emoji: "🌿", title: "Pure Aloe Vera", desc: "World's largest grower. IASC certified. Up to 99.7% pure stabilized gel." },
                { emoji: "🌍", title: "160+ Countries", desc: "Operating for over 46 years across 6 continents. A proven global brand." },
                { emoji: "💰", title: "3 Income Streams", desc: "Retail profit (30-48%), team building bonuses, and leadership rewards." },
                { emoji: "🚗", title: "Forever2Drive", desc: "$400-$800/month car bonus for qualifying managers. 3-year program." },
                { emoji: "🏆", title: "Inheritable Business", desc: "Pass your business to the next generation. A true legacy asset." },
                { emoji: "📱", title: "AI-Powered Tools", desc: "MarketFlow chatbot, automated ads, landing funnels — all on autopilot." },
              ].map((b) => (
                <div key={b.title} className="rounded-xl border p-4 transition hover:shadow-sm">
                  <span className="text-2xl">{b.emoji}</span>
                  <h3 className="mt-2 text-sm font-semibold">{b.title}</h3>
                  <p className="mt-1 text-xs text-muted-foreground">{b.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Product Spotlight (FLP) ───────────────────────────── */}
        {isFLP && did && (
          <section className="py-8 border-t">
            <h2 className="mb-6 text-xl font-bold text-center">Featured Products</h2>
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3">
              {[
                { name: "Aloe Vera Gel", code: "015", cc: "0.103", desc: "Pure inner leaf gel for digestive wellness." },
                { name: "C9 Clean 9", code: "475", cc: "2.000", desc: "9-day nutritional cleanse program." },
                { name: "Forever Argi+", code: "473", cc: "0.300", desc: "L-Arginine + vitamin complex for vitality." },
                { name: "Aloe Vera Gelly", code: "061", cc: "0.069", desc: "Topical soothing gel for skin." },
                { name: "Forever Bright", code: "028", cc: "0.054", desc: "Aloe vera toothgel with bee propolis." },
                { name: "Aloe Moisturizing Lotion", code: "063", cc: "0.102", desc: "Daily body moisturizer with aloe." },
              ].map((p) => (
                <a
                  key={p.code}
                  href={`${shopLink}&itemCode=${p.code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="group rounded-xl border p-3 transition hover:shadow-sm hover:border-amber-200"
                >
                  <div className="text-xs text-muted-foreground">#{p.code} · CC {p.cc}</div>
                  <h3 className="mt-1 text-sm font-semibold group-hover:text-amber-600 transition">{p.name}</h3>
                  <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{p.desc}</p>
                </a>
              ))}
            </div>
            <div className="mt-4 text-center">
              <a href={shopLink} target="_blank" rel="noreferrer" className="text-sm font-medium hover:underline" style={{ color: brandColor }}>
                View all products →
              </a>
            </div>
          </section>
        )}

        {/* ── Testimonials ──────────────────────────────────────── */}
        {testimonials.length > 0 && (
          <section className="py-8 border-t">
            <h2 className="mb-6 text-xl font-bold text-center">What people are saying</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {testimonials.map((t) => (
                <figure key={t.id} className="rounded-xl border p-5">
                  <blockquote className="text-sm leading-relaxed">&ldquo;{t.body}&rdquo;</blockquote>
                  <figcaption className="mt-3 flex items-center gap-3">
                    {t.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={t.avatar_url} alt={t.author_name} className="h-9 w-9 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold text-white" style={{ background: brandColor }}>
                        {t.author_name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{t.author_name}</div>
                      {t.author_role && <div className="text-[11px] text-muted-foreground">{t.author_role}</div>}
                    </div>
                    <div className="text-xs text-amber-500">{"★".repeat(t.rating)}<span className="text-slate-200">{"★".repeat(5 - t.rating)}</span></div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* ── Cal.com Booking ───────────────────────────────────── */}
        {calcomUsername && (
          <section className="py-8 border-t">
            <div className="overflow-hidden rounded-2xl border shadow-sm">
              <div className="border-b px-5 py-3">
                <h2 className="text-lg font-bold">Book a call with {name}</h2>
                <p className="text-xs text-muted-foreground">Free 15-minute intro — pick a time that works for you.</p>
              </div>
              <iframe src={`https://calendar.codevertexitsolutions.com/${calcomUsername}/${calcomEvent}`} className="h-[580px] w-full" title="Book a meeting" loading="lazy" />
            </div>
          </section>
        )}

        {/* ── CTA Banner ────────────────────────────────────────── */}
        <section className="py-8 border-t">
          <div className="rounded-2xl p-6 text-center text-white" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}>
            <h2 className="text-xl font-bold">Ready to get started?</h2>
            <p className="mt-1 text-sm opacity-90">Chat with me or ask our AI assistant anything about products and the business opportunity.</p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer" className="rounded-full bg-white px-5 py-2 text-sm font-medium shadow-sm transition hover:shadow-md" style={{ color: brandColor }}>
                  💬 Chat on WhatsApp
                </a>
              )}
              {shopLink && (
                <a href={shopLink} target="_blank" rel="noreferrer" className="rounded-full border border-white/40 px-5 py-2 text-sm font-medium text-white transition hover:bg-white/10">
                  🛒 Browse Products
                </a>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Chat widget */}
      <script async src="/widget/chat.js" data-tenant={profile.slug} data-api-url={AI_API_URL} />

      {/* Visitor analytics beacon */}
      <script dangerouslySetInnerHTML={{ __html: `
(function(){
  try {
    var slug = ${JSON.stringify(profile.slug)};
    var api = ${JSON.stringify(API_URL)};
    var send = function(type, meta){
      try { fetch(api + '/api/v1/public/profile-events', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({slug: slug, event_type: type, referrer: document.referrer, metadata: meta||{}}), keepalive: true }).catch(function(){}); } catch(e) {}
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
      `.trim() }} />

      <footer className="border-t py-4 text-center text-[11px] text-muted-foreground">
        Powered by <a href={APP_URL} className="font-medium hover:underline">MarketFlow</a> · Codevertex Africa Ltd
      </footer>
    </div>
  );
}
