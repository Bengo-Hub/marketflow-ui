import type { Metadata } from "next";
import { notFound } from "next/navigation";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://marketflowapi.codevertexitsolutions.com";
const AI_API_URL = process.env.NEXT_PUBLIC_AI_API_URL || "https://marketflowai.codevertexitsolutions.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://marketflow.codevertexitsolutions.com";

type Profile = {
  id: string; name: string; slug: string; business_type?: string; country?: string;
  whatsapp_number?: string; fbo_distrib_id?: string; flp_store_code?: string; flp_language?: string;
  metadata?: Record<string, any>;
};

type Testimonial = { id: string; author_name: string; author_role?: string; body: string; avatar_url?: string; rating: number };

async function getProfile(slug: string): Promise<Profile | null> {
  try { const r = await fetch(`${API_URL}/api/v1/public/profile/${slug}`, { next: { revalidate: 300 } }); return r.ok ? r.json() : null; } catch { return null; }
}
async function getTestimonials(slug: string): Promise<Testimonial[]> {
  try { const r = await fetch(`${API_URL}/api/v1/public/profile/${slug}/testimonials?limit=10`, { next: { revalidate: 300 } }); if (!r.ok) return []; const j = await r.json(); return j.data ?? []; } catch { return []; }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProfile(slug);
  if (!p) return { title: "Profile not found" };
  const name = p.name || slug;
  const tagline = p.metadata?.tagline ?? "Business Owner";
  const bio = p.metadata?.bio ?? `Discover products and opportunities with ${name}.`;
  return { title: `${name} — ${tagline}`, description: bio, alternates: { canonical: `${APP_URL}/p/${p.slug}` },
    openGraph: { title: `${name} — ${tagline}`, description: bio, url: `${APP_URL}/p/${p.slug}`, type: "profile" } };
}

export default async function FBOProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [profile, testimonials] = await Promise.all([getProfile(slug), getTestimonials(slug)]);
  if (!profile) notFound();

  const m = (profile.metadata ?? {}) as Record<string, any>;
  const name = profile.name || slug;
  const brandColor = m.brand_primary_color || "#f59e0b";
  const tagline = m.tagline ?? (profile.business_type === "flp" ? "Forever Business Owner" : "Business Owner");
  const bio = m.bio;
  const story = m.story;
  const videoUrl = m.video_url;
  const isFLP = profile.business_type === "flp";
  const store = profile.flp_store_code || "KEN";
  const lang = profile.flp_language || "en";
  const did = profile.fbo_distrib_id || "";
  const shopLink = did ? `https://shop.foreverliving.com/retail/entry/Shop.do?store=${store}&language=${lang}&distribID=${did}` : "";
  const recruitLink = did ? `https://join.foreverliving.com/marketing/joinnow/applicationForm.do?action=display&store=${store}&distribID=${did}&menuoff=n&langID=${lang}` : "";
  const waDigits = (profile.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waLink = waDigits ? `https://wa.me/${waDigits}?text=${encodeURIComponent(`Hi ${name}, I'm interested in learning more!`)}` : "";
  // Booking: prefer Google Calendar link, fallback to Cal.com
  const googleCalLink = m.google_calendar_link as string | undefined;
  const calcomUser = m.calcom_username as string | undefined;
  const calcomEvent = (m.calcom_event as string) ?? "15min";
  const bookingUrl = googleCalLink || (calcomUser ? `https://calendar.codevertexitsolutions.com/${calcomUser}/${calcomEvent}` : "");
  const hasBooking = !!bookingUrl;

  return (
    <div className="min-h-screen bg-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({
        "@context": "https://schema.org", "@type": "Person", name, jobTitle: tagline,
        worksFor: { "@type": "Organization", name: isFLP ? "Forever Living Products" : name },
        url: `${APP_URL}/p/${profile.slug}`, ...(bio && { description: bio }),
      }) }} />

      {/* ══════ HERO with aloe farm background ══════ */}
      <div className="relative overflow-hidden">
        {/* Background: aloe vera farm for FLP, gradient for generic */}
        {isFLP ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/images/public-profile/aloe-farm.jpg"
              alt="Aloe vera farm"
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70" />
          </>
        ) : (
          <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${brandColor}dd 0%, ${brandColor}88 100%)` }} />
        )}

        <div className="relative mx-auto max-w-4xl px-4 py-14 md:py-20 text-center text-white">
          {isFLP && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src="https://cdn.foreverliving.com/content/images/forever-logo-white.png" alt="Forever Living" className="mx-auto mb-6 h-8 opacity-90"
              />
          )}

          {/* Avatar */}
          <div className="mx-auto mb-4">
            {m.logo_url ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={m.logo_url} alt={name} className="mx-auto h-24 w-24 rounded-full border-4 border-white/80 object-cover shadow-xl" />
            ) : (
              <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border-4 border-white/80 text-3xl font-bold shadow-xl" style={{ background: brandColor }}>
                {name.charAt(0)}
              </div>
            )}
          </div>

          <h1 className="text-3xl md:text-4xl font-bold drop-shadow-lg">{name}</h1>
          <p className="mt-1 text-lg opacity-90 drop-shadow">{tagline}</p>
          {bio && <p className="mt-3 mx-auto max-w-xl text-sm opacity-80 leading-relaxed">{bio}</p>}

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            {waLink && (
              <a href={waLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2.5 text-sm font-medium text-white shadow-lg hover:bg-[#1DA851] transition">
                💬 Chat on WhatsApp
              </a>
            )}
            {shopLink && (
              <a href={shopLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-medium text-white border border-white/30 hover:bg-white/30 transition">
                🛒 Shop Products
              </a>
            )}
            {recruitLink && (
              <a href={recruitLink} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur px-5 py-2.5 text-sm font-medium text-white border border-white/30 hover:bg-white/30 transition">
                🤝 Join My Team
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4">

        {/* ══════ WHAT IS FOREVER LIVING? (FLP only) ══════ */}
        {isFLP && (
          <section className="py-10 text-center">
            <h2 className="text-2xl font-bold">What is Forever Living?</h2>
            <p className="mt-3 mx-auto max-w-2xl text-sm text-gray-600 leading-relaxed">
              Forever Living Products is the world&apos;s largest grower, manufacturer, and distributor of aloe vera.
              For over 46 years, we&apos;ve operated in 160+ countries, delivering pure, IASC-certified wellness
              products from our own farms to your doorstep. Our products contain up to 99.7% pure stabilized
              aloe vera gel — because we control every step from plant to product.
            </p>
            {/* Aloe product banner */}
            <div className="mt-6 grid grid-cols-3 gap-3 max-w-lg mx-auto">
              {[
                { src: "https://cdn.foreverliving.com/content/products/images/015_aloe_vera_gel_pd_main_512_X_512_1702972857237.webp", label: "Aloe Vera Gel" },
                { src: "https://cdn.foreverliving.com/content/products/images/fab_x_forever_active_boost__pd_zoomedimage_1000_X_1000_1775075598612.jpg", label: "FAB X" },
                { src: "https://cdn.foreverliving.com/content/products/images/c9_chocolate_pd_main_512_X_512_1702972869296.webp", label: "C9 Clean 9" },
              ].map((img) => (
                <div key={img.label} className="text-center">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={img.src} alt={img.label} className="mx-auto h-24 w-24 rounded-xl object-contain" loading="lazy"
                    />
                  <p className="mt-1 text-[10px] text-gray-500">{img.label}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══════ ABOUT THE OPPORTUNITY ══════ */}
        {isFLP && (
          <section className="py-8 border-t">
            <h2 className="text-2xl font-bold text-center">About the Opportunity</h2>
            <p className="mt-3 mx-auto max-w-2xl text-sm text-gray-600 leading-relaxed text-center">
              As a Forever Business Owner (FBO), you earn through three income streams: retail profit (30-48%),
              team building bonuses, and leadership rewards. With the Forever2Drive car bonus program ($400-$800/month
              for 3 years), global travel incentives, and an inheritable business model — this is more than a job,
              it&apos;s a legacy you can pass to the next generation.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: "💰", title: "Earn 30-48% Retail Profit", desc: "Every product you sell earns immediate margin — no waiting for commission payouts." },
                { icon: "👥", title: "Build a Team & Earn More", desc: "Sponsor others and earn bonuses from your team's sales volume, up to Eagle Manager." },
                { icon: "🚗", title: "Forever2Drive", desc: "$400-$800/month car allowance for qualifying managers. 3-year program." },
                { icon: "🌍", title: "Global Travel Incentives", desc: "Top performers earn all-expenses-paid trips to exotic destinations worldwide." },
                { icon: "🏆", title: "Inheritable Business", desc: "Your Forever business can be passed to your children — a true legacy asset." },
                { icon: "📱", title: "AI-Powered by MarketFlow", desc: "Automated chatbot, ad campaigns, landing funnels — your AI marketing assistant." },
              ].map((b) => (
                <div key={b.title} className="rounded-xl border p-4 hover:shadow-sm transition">
                  <span className="text-xl">{b.icon}</span>
                  <h3 className="mt-2 text-sm font-semibold">{b.title}</h3>
                  <p className="mt-1 text-xs text-gray-500 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ══════ MY FOREVER STORY ══════ */}
        {(videoUrl || story) && (
          <section className="py-8 border-t">
            <h2 className="text-2xl font-bold text-center">{isFLP ? "My Forever Story" : `About ${name}`}</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2 items-center max-w-3xl mx-auto">
              <div>
                {videoUrl ? (
                  <div className="aspect-video overflow-hidden rounded-2xl shadow-lg">
                    <iframe src={videoUrl} className="h-full w-full" allow="autoplay; fullscreen" loading="lazy" title="Story" />
                  </div>
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src="/images/public-profile/fbo-one-on-one-meeting.jpg" alt="Business meeting"
                    className="rounded-2xl shadow-lg w-full object-cover" loading="lazy" />
                )}
              </div>
              <div>
                {story && <p className="text-sm text-gray-600 leading-relaxed">{story}</p>}
                {!story && isFLP && (
                  <p className="text-sm text-gray-600 leading-relaxed">
                    Discover how Forever Living Products can transform your health and create financial freedom.
                    Book a one-on-one meeting to learn about the business opportunity and get personalised guidance
                    on building your own team.
                  </p>
                )}
                {waLink && (
                  <a href={waLink} target="_blank" rel="noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2 text-sm font-medium text-white hover:bg-[#1DA851] transition">
                    💬 Let&apos;s Chat
                  </a>
                )}
              </div>
            </div>
          </section>
        )}
        {/* Show meeting image section even without video/story for FLP tenants */}
        {!videoUrl && !story && isFLP && (
          <section className="py-8 border-t">
            <h2 className="text-2xl font-bold text-center">Book a One-on-One Meeting</h2>
            <div className="mt-6 grid gap-6 md:grid-cols-2 items-center max-w-3xl mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/public-profile/fbo-one-on-one-meeting.jpg" alt="Business meeting"
                className="rounded-2xl shadow-lg w-full object-cover" loading="lazy" />
              <div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  Ready to learn more? Book a free, no-obligation one-on-one meeting with me. I&apos;ll walk you through
                  the products, the business opportunity, and how you can get started — whether you want to be a
                  customer or build your own Forever business.
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {waLink && (
                    <a href={waLink} target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full bg-[#25D366] px-5 py-2 text-sm font-medium text-white hover:bg-[#1DA851] transition">
                      💬 WhatsApp Me
                    </a>
                  )}
                  {hasBooking && (
                    <a href="#booking"
                      className="inline-flex items-center gap-2 rounded-full border px-5 py-2 text-sm font-medium hover:bg-gray-50 transition">
                      📅 Book a Call
                    </a>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ══════ FEATURED PRODUCTS ══════ */}
        {isFLP && did && (
          <section className="py-8 border-t">
            <h2 className="text-2xl font-bold text-center">Featured Products</h2>
            <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3">
              {PRODUCTS.map((p) => (
                <a key={p.code} href={`${shopLink}&itemCode=${p.code}`} target="_blank" rel="noreferrer"
                  className="group rounded-xl border p-3 text-center hover:shadow-md hover:border-amber-200 transition">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.name} className="mx-auto h-20 w-20 object-contain" loading="lazy"
                    />
                  <div className="mt-2 text-xs text-gray-400">#{p.code} · CC {p.cc}</div>
                  <h3 className="text-sm font-semibold group-hover:text-amber-600 transition">{p.name}</h3>
                  <p className="mt-1 text-[10px] text-gray-500 line-clamp-2">{p.desc}</p>
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

        {/* ══════ TESTIMONIALS ══════ */}
        {testimonials.length > 0 && (
          <section className="py-8 border-t">
            <h2 className="text-2xl font-bold text-center">What People Are Saying</h2>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              {testimonials.map((t) => (
                <figure key={t.id} className="rounded-xl border p-5">
                  <blockquote className="text-sm leading-relaxed text-gray-700">&ldquo;{t.body}&rdquo;</blockquote>
                  <figcaption className="mt-3 flex items-center gap-3">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: brandColor }}>
                      {t.author_name.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold truncate">{t.author_name}</div>
                      {t.author_role && <div className="text-[10px] text-gray-400">{t.author_role}</div>}
                    </div>
                    <div className="text-xs text-amber-500">{"★".repeat(t.rating)}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* ══════ BOOKING (Google Calendar preferred, Cal.com fallback) ══════ */}
        {hasBooking && (
          <section id="booking" className="py-8 border-t">
            <div className="overflow-hidden rounded-2xl border shadow-sm">
              <div className="border-b px-5 py-3" style={{ background: `${brandColor}15` }}>
                <h2 className="text-lg font-bold">Book a Free Call with {name}</h2>
                <p className="text-xs text-gray-500">15-minute intro — no obligation, just conversation.</p>
              </div>
              <iframe src={bookingUrl}
                className="h-[560px] w-full" title="Book a meeting" loading="lazy" />
            </div>
          </section>
        )}

        {/* ══════ CTA BANNER ══════ */}
        <section className="py-8 border-t">
          <div className="rounded-2xl p-8 text-center text-white" style={{ background: `linear-gradient(135deg, ${brandColor}, ${brandColor}cc)` }}>
            <h2 className="text-xl font-bold">Ready to Get Started?</h2>
            <p className="mt-2 text-sm opacity-90">Chat with me or ask our AI assistant anything — products, business opportunity, or getting started.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              {waLink && (
                <a href={waLink} target="_blank" rel="noreferrer"
                  className="rounded-full bg-white px-6 py-2.5 text-sm font-medium shadow-sm hover:shadow-md transition" style={{ color: brandColor }}>
                  💬 WhatsApp Me
                </a>
              )}
              {shopLink && (
                <a href={shopLink} target="_blank" rel="noreferrer"
                  className="rounded-full border border-white/40 px-6 py-2.5 text-sm font-medium text-white hover:bg-white/10 transition">
                  🛒 Browse Products
                </a>
              )}
            </div>
          </div>
        </section>
      </div>

      {/* Chat widget — auto-opens on profile pages */}
      <script async src="/widget/chat.js" data-tenant={profile.slug} data-api-url={AI_API_URL}
        data-color={brandColor} data-autoopen="true" />

      {/* Analytics beacon */}
      <script dangerouslySetInnerHTML={{ __html: `
(function(){try{var s=${JSON.stringify(profile.slug)},a=${JSON.stringify(API_URL)};
var f=function(t,m){try{fetch(a+'/api/v1/public/profile-events',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({slug:s,event_type:t,referrer:document.referrer,metadata:m||{}}),keepalive:true}).catch(function(){});}catch(e){}};
f('page_view');document.addEventListener('click',function(e){var el=e.target;while(el&&el.nodeType===1){var h=el.getAttribute&&el.getAttribute('href');
if(h){if(/wa\\.me/.test(h))return f('whatsapp_click');if(/cal/.test(h))return f('book_click');
if(/shop\\.foreverliving/.test(h))return f('product_click',{href:h});if(/join\\.foreverliving/.test(h))return f('cta_click',{cta:'join'});}
el=el.parentNode;}},true);}catch(e){}})();`.trim() }} />

      <footer className="border-t py-4 text-center text-[10px] text-gray-400">
        Powered by <a href={APP_URL} className="font-medium hover:underline text-gray-500">MarketFlow</a> · Codevertex Africa Ltd
      </footer>
    </div>
  );
}

const PRODUCTS = [
  { code: "015", name: "Aloe Vera Gel", cc: "0.103", desc: "Pure inner leaf gel for digestive wellness.", img: "https://cdn.foreverliving.com/content/products/images/015_aloe_vera_gel_pd_main_512_X_512_1702972857237.webp" },
  { code: "C9", name: "C9 Clean 9", cc: "2.000", desc: "9-day nutritional cleanse program.", img: "https://cdn.foreverliving.com/content/products/images/c9_chocolate_pd_main_512_X_512_1702972869296.webp" },
  { code: "473", name: "Forever Argi+", cc: "0.300", desc: "L-Arginine + vitamin complex for vitality.", img: "https://cdn.foreverliving.com/content/products/images/473_forever_argi_pd_main_512_X_512_1702972861557.webp" },
  { code: "061", name: "Aloe Vera Gelly", cc: "0.069", desc: "Topical soothing gel for skin.", img: "https://cdn.foreverliving.com/content/products/images/061_aloe_vera_gelly_pd_main_512_X_512_1702972858107.webp" },
  { code: "028", name: "Forever Bright", cc: "0.054", desc: "Aloe vera toothgel with bee propolis.", img: "https://cdn.foreverliving.com/content/products/images/028_forever_bright_pd_main_512_X_512_1702972858741.webp" },
  { code: "063", name: "Aloe Moisturizing Lotion", cc: "0.102", desc: "Daily body moisturizer with aloe.", img: "https://cdn.foreverliving.com/content/products/images/063_aloe_moisturizing_lotion_pd_main_512_X_512_1702972858267.webp" },
];
