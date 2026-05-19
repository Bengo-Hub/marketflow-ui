import type { Metadata } from "next";
import { notFound } from "next/navigation";

const API = process.env.NEXT_PUBLIC_API_URL || "https://marketflowapi.codevertexitsolutions.com";
const AI = process.env.NEXT_PUBLIC_AI_API_URL || "https://marketflowai.codevertexitsolutions.com";
const APP = process.env.NEXT_PUBLIC_APP_URL || "https://marketflow.codevertexitsolutions.com";
const FALLBACK_VIDEO = "https://www.youtube.com/embed/YRvN_JkHSzQ";

type P = { id: string; name: string; slug: string; business_type?: string; country?: string; whatsapp_number?: string; fbo_distrib_id?: string; flp_store_code?: string; flp_language?: string; metadata?: Record<string, any> };
type T = { id: string; author_name: string; author_role?: string; body: string; avatar_url?: string; rating: number };

async function gp(s: string): Promise<P | null> { try { const r = await fetch(`${API}/api/v1/public/profile/${s}`, { next: { revalidate: 300 } }); return r.ok ? r.json() : null; } catch { return null; } }
async function gt(s: string): Promise<T[]> { try { const r = await fetch(`${API}/api/v1/public/profile/${s}/testimonials?limit=6`, { next: { revalidate: 300 } }); if (!r.ok) return []; const j = await r.json(); return j.data ?? []; } catch { return []; } }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const p = await gp(slug); if (!p) return { title: "Not found" };
  const n = p.name || slug, tl = p.metadata?.tagline ?? "Business Owner", bio = p.metadata?.bio ?? "";
  return { title: `${n} — ${tl}`, description: bio, alternates: { canonical: `${APP}/p/${p.slug}` }, openGraph: { title: `${n} — ${tl}`, description: bio, url: `${APP}/p/${p.slug}`, type: "profile" } };
}

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [profile, testimonials] = await Promise.all([gp(slug), gt(slug)]);
  if (!profile) notFound();

  const m = (profile.metadata ?? {}) as Record<string, any>;
  const name = profile.name || slug;
  const brand = (m.brand_primary_color as string) || "#f59e0b";
  const tagline = (m.tagline as string) || (profile.business_type === "flp" ? "Forever Business Owner" : "Business Owner");
  const bio = (m.bio as string) || "Forever Living Products is the largest grower, manufacturer and distributor of Aloe Vera products in the world.";
  const story = (m.story as string) || "Forever Living Products was founded in 1978 and has grown into a global wellness empire operating in over 160 countries. We are the world's largest grower of aloe vera with our own plantations, IASC certified, USDA and EU Organic certified.";
  const opportunity = (m.opportunity_text as string) || "As a Forever Business Owner, you earn through retail profit (30-48%), team building bonuses, and leadership rewards. With the Forever2Drive car bonus and global travel incentives, this is a true legacy business you can pass to the next generation.";
  const videoUrl = (m.video_url as string) || FALLBACK_VIDEO;
  const isFLP = profile.business_type === "flp";
  const s = profile.flp_store_code || "KEN", l = profile.flp_language || "en", d = profile.fbo_distrib_id || "";
  const shop = d ? `https://shop.foreverliving.com/retail/entry/Shop.do?store=${s}&language=${l}&distribID=${d}` : "";
  const recruit = d ? `https://join.foreverliving.com/marketing/joinnow/applicationForm.do?action=display&store=${s}&distribID=${d}&menuoff=n&langID=${l}` : "";
  const waD = (profile.whatsapp_number || "").replace(/[^0-9]/g, "");
  const waReal = waD && !/0{5,}/.test(waD) && !/(\d)\1{5,}/.test(waD);
  const wa = waReal ? `https://wa.me/${waD}?text=${encodeURIComponent(`Hi ${name}, I'm interested!`)}` : "";
  const contactEmail = (m.contact_email as string | undefined) || "";
  const gcal = m.google_calendar_link as string | undefined;
  const ccUser = m.calcom_username as string | undefined;
  const booking = gcal || (ccUser ? `https://calendar.codevertexitsolutions.com/${ccUser}/${m.calcom_event || "15min"}` : "");

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify({ "@context": "https://schema.org", "@type": "Person", name, jobTitle: tagline, url: `${APP}/p/${profile.slug}`, description: bio }) }} />

      {/* ═══ HERO ═══ */}
      <header className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/public-profile/aloe-farm.jpg" alt="" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/40 to-black/60" />
        <div className="relative px-4 py-10 sm:py-14 text-center text-white max-w-2xl mx-auto">
          {/* Forever logo for FLP tenants, user logo if provided, fallback initial */}
          {isFLP && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src="/images/public-profile/forever-logo.jpg" alt="Forever Living" className="mx-auto h-14 mb-3 drop-shadow-lg" />
          )}
          {m.logo_url ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={m.logo_url} alt={name} className="mx-auto h-20 w-20 rounded-full border-[3px] border-white/70 object-cover shadow-lg" />
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-[3px] border-white/70 text-2xl font-bold shadow-lg" style={{ background: brand }}>{name.charAt(0)}</div>
          )}
          <h1 className="mt-3 text-2xl sm:text-3xl font-bold">{name}</h1>
          <p className="text-sm opacity-80">{tagline}</p>
          <p className="mt-2 text-xs sm:text-sm opacity-70 max-w-md mx-auto leading-relaxed">{bio}</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {wa && <a href={wa} target="_blank" rel="noreferrer" className="rounded-full bg-[#25D366] px-4 py-2 text-xs sm:text-sm font-medium shadow hover:bg-[#1DA851] transition">💬 WhatsApp</a>}
            {!wa && contactEmail && <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Hi ${name}, I'm interested`)}`} className="rounded-full bg-[#4F46E5] px-4 py-2 text-xs sm:text-sm font-medium shadow hover:bg-[#4338CA] transition text-white">✉️ Email Me</a>}
            {shop && <a href={shop} target="_blank" rel="noreferrer" className="rounded-full bg-white/20 backdrop-blur border border-white/30 px-4 py-2 text-xs sm:text-sm font-medium hover:bg-white/30 transition">🛒 Shop</a>}
            {recruit && <a href={recruit} target="_blank" rel="noreferrer" className="rounded-full bg-white/20 backdrop-blur border border-white/30 px-4 py-2 text-xs sm:text-sm font-medium hover:bg-white/30 transition">🤝 Join Team</a>}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ═══ WHAT IS FOREVER LIVING ═══ */}
        {isFLP && (
          <section className="py-8 text-center">
            <h2 className="text-xl font-bold">What is Forever Living?</h2>
            <p className="mt-2 text-sm text-gray-500 max-w-xl mx-auto leading-relaxed">
              Forever Living Products is the world&apos;s largest grower, manufacturer and distributor of aloe vera. For over 46 years, operating in 160+ countries, IASC certified, with products containing up to 99.7% pure stabilized aloe vera gel.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-4 sm:gap-6">
              {PRODUCTS.slice(0, 4).map((p) => (
                <a key={p.code} href={shop ? `${shop}&itemCode=${p.code}` : "#"} target="_blank" rel="noreferrer" className="group text-center w-20 sm:w-24">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.img} alt={p.name} className="mx-auto h-16 sm:h-20 w-16 sm:w-20 object-contain rounded-xl group-hover:scale-105 transition" loading="lazy" />
                  <p className="mt-1 text-[10px] sm:text-xs text-gray-500 group-hover:text-amber-600 transition leading-tight">{p.name}</p>
                </a>
              ))}
            </div>
            {shop && <a href={shop} target="_blank" rel="noreferrer" className="mt-3 inline-block text-xs font-medium hover:underline" style={{ color: brand }}>View all products →</a>}
          </section>
        )}

        {/* ═══ ABOUT THE OPPORTUNITY ═══ */}
        {isFLP && (
          <section className="py-8 border-t">
            <h2 className="text-xl font-bold text-center">About the Opportunity</h2>
            <div className="mt-4 space-y-4 text-sm text-gray-500 text-center max-w-xl mx-auto leading-relaxed">
              {opportunity.split("\n\n").map((para, i) => (
                <p key={i}>{para}</p>
              ))}
            </div>
            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { img: "/images/public-profile/retail-profit.jpg", t: "30-48% Retail Profit", d: "Immediate margin on every sale." },
                { img: "/images/public-profile/build-a-team.jpg", t: "Build a Team", d: "Earn bonuses from your team volume." },
                { img: "/images/public-profile/forever2drive-image.png", t: "🚗 Forever2Drive", d: "$400-$800/month car bonus." },
                { img: "/images/public-profile/global-travel.jpg", t: "🌍 Global Travel", d: "All-expenses-paid incentive trips." },
                { img: "/images/public-profile/inheritable-business.jpg", t: "🏆 Inheritable Business", d: "Pass it to the next generation." },
              ].map((b) => (
                <div key={b.t} className="rounded-lg border overflow-hidden hover:shadow-sm transition">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={b.img} alt={b.t} className="w-full h-28 object-cover" loading="lazy" />
                  <div className="p-3">
                    <h3 className="text-xs font-semibold">{b.t}</h3>
                    <p className="text-[10px] text-gray-400 mt-0.5">{b.d}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-8 pt-6 border-t border-gray-100 text-[11px] text-gray-400 italic text-center max-w-xl mx-auto leading-relaxed">
              *Individual results may vary. Forever makes no guarantees on income or success. Your success depends on your effort, commitment, skill, and leadership abilities, and how effectively you exercise those qualities. Please see Forever’s Annual Income Disclosure Statement at <a href="https://foreverliving.com/income" target="_blank" rel="noreferrer" className="underline hover:text-gray-600">foreverliving.com/income</a> for more information.
            </div>
          </section>
        )}

        {/* ═══ THE FOREVER STORY (video + text) ═══ */}
        {isFLP && (
          <section className="py-8 border-t">
            <h2 className="text-xl font-bold text-center">The Forever Story</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 items-center">
              <div className="aspect-video rounded-xl overflow-hidden shadow-md">
                <iframe src={videoUrl} className="w-full h-full" allow="autoplay; fullscreen; encrypted-media" loading="lazy" title="Forever Story" />
              </div>
              <div>
                <p className="text-sm text-gray-500 leading-relaxed">{story}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {wa && <a href={wa} target="_blank" rel="noreferrer" className="rounded-full bg-[#25D366] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#1DA851] transition">💬 Chat</a>}
                  {!wa && contactEmail && <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Hi ${name}, I'd like to know more`)}`} className="rounded-full bg-[#4F46E5] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#4338CA] transition">✉️ Email</a>}
                  {booking && <a href="#booking" className="rounded-full border px-4 py-1.5 text-xs font-medium hover:bg-gray-50 transition">📅 Book a Call</a>}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══ ONE-ON-ONE MEETING ═══ */}
        {isFLP && (
          <section className="py-8 border-t">
            <h2 className="text-xl font-bold text-center">Book a One-on-One Meeting</h2>
            <div className="mt-5 grid gap-5 sm:grid-cols-2 items-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/images/public-profile/fbo-one-on-one-meeting.jpg" alt="Meeting" className="rounded-xl shadow-md w-full h-44 object-cover" loading="lazy" />
              <div>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Ready to learn more? Book a free, no-obligation one-on-one with me. I&apos;ll walk you through the products, the opportunity, and how to get started.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {booking ? (
                    <a href="#booking" className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition">📅 Book a Call</a>
                  ) : wa ? (
                    <a href={`https://wa.me/${waD}?text=${encodeURIComponent(`Hi ${name}, I'd like to book a one-on-one meeting with you!`)}`} target="_blank" rel="noreferrer" className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition">📅 Book a Meeting</a>
                  ) : contactEmail ? (
                    <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Hi ${name}, I'd like to book a meeting`)}`} className="rounded-full bg-amber-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-amber-600 transition">📅 Book a Meeting</a>
                  ) : null}
                  {wa && <a href={wa} target="_blank" rel="noreferrer" className="rounded-full bg-[#25D366] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#1DA851] transition">💬 WhatsApp</a>}
                  {!wa && contactEmail && <a href={`mailto:${contactEmail}`} className="rounded-full bg-[#25D366] px-4 py-1.5 text-xs font-medium text-white hover:bg-[#1DA851] transition">✉️ Email</a>}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ═══ FEATURED PRODUCTS ═══ */}
        {isFLP && d && (
          <section className="py-10 border-t">
            <div className="text-center mb-7">
              <h2 className="text-2xl font-bold text-gray-900">Featured Products</h2>
              <p className="mt-1.5 text-sm text-gray-400">Tap any product to shop directly in the Forever Living store</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
              {PRODUCTS.map((p) => (
                <a key={p.code} href={`${shop}&itemCode=${p.code}`} target="_blank" rel="noreferrer"
                  className="group relative flex flex-col rounded-2xl overflow-hidden border border-gray-100 bg-white shadow-sm hover:shadow-xl hover:border-amber-200 hover:-translate-y-0.5 transition-all duration-300">
                  {/* Image area */}
                  <div className="bg-gradient-to-b from-gray-50 to-white flex items-center justify-center h-44 sm:h-48 p-5">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.img} alt={p.name} className="h-36 sm:h-40 w-full object-contain group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  </div>
                  {/* Details area */}
                  <div className="flex flex-col flex-1 p-3.5 border-t border-gray-50">
                    <span className="inline-block self-start text-[9px] font-semibold tracking-wide uppercase text-amber-600 bg-amber-50 rounded-full px-2 py-0.5 mb-2">#{p.code}</span>
                    <h3 className="text-xs sm:text-sm font-semibold text-gray-900 group-hover:text-amber-600 transition-colors leading-snug">{p.name}</h3>
                    <p className="mt-1 text-[10px] sm:text-[11px] text-gray-400 line-clamp-2 leading-relaxed flex-1">{p.desc}</p>
                    <div className="mt-2.5 flex items-center justify-between pt-2 border-t border-gray-50">
                      <span className="text-[9px] text-gray-300 font-medium">CC {p.cc}</span>
                      <span className="text-[10px] font-semibold text-amber-500 group-hover:text-amber-600 transition-colors">Shop →</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
            {shop && (
              <div className="mt-7 text-center">
                <a href={shop} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border px-6 py-2.5 text-sm font-medium hover:shadow-md transition-all duration-200"
                  style={{ color: brand, borderColor: brand }}>
                  View All Products →
                </a>
              </div>
            )}
          </section>
        )}

        {/* ═══ TESTIMONIALS ═══ */}
        {testimonials.length > 0 && (
          <section className="py-8 border-t">
            <h2 className="text-xl font-bold text-center">What People Are Saying</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {testimonials.map((t) => (
                <figure key={t.id} className="rounded-xl border p-4">
                  <blockquote className="text-xs leading-relaxed text-gray-600">&ldquo;{t.body}&rdquo;</blockquote>
                  <figcaption className="mt-2 flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white" style={{ background: brand }}>{t.author_name.charAt(0)}</div>
                    <div className="flex-1 min-w-0"><div className="text-xs font-semibold truncate">{t.author_name}</div>{t.author_role && <div className="text-[10px] text-gray-400">{t.author_role}</div>}</div>
                    <div className="text-[10px] text-amber-500">{"★".repeat(t.rating)}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </section>
        )}

        {/* ═══ BOOKING IFRAME ═══ */}
        {booking && (
          <section id="booking" className="py-8 border-t">
            <div className="overflow-hidden rounded-xl border shadow-sm">
              <div className="px-4 py-3 border-b" style={{ background: `${brand}10` }}>
                <h2 className="text-base font-bold">Book a Call with {name}</h2>
                <p className="text-[10px] text-gray-400">Free 15-min intro — no obligation.</p>
              </div>
              <iframe src={booking} className="w-full h-[500px]" title="Book" loading="lazy" />
            </div>
          </section>
        )}

        {/* ═══ CTA ═══ */}
        <section className="py-8 border-t">
          <div className="rounded-xl p-6 text-center text-white" style={{ background: `linear-gradient(135deg, ${brand}, ${brand}cc)` }}>
            <h2 className="text-lg font-bold">Ready to Get Started?</h2>
            <p className="mt-1 text-xs opacity-90">Chat with me or ask our AI assistant about products and the business opportunity.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {wa && <a href={wa} target="_blank" rel="noreferrer" className="rounded-full bg-white px-5 py-2 text-xs font-medium shadow hover:shadow-md transition" style={{ color: brand }}>💬 WhatsApp</a>}
              {!wa && contactEmail && <a href={`mailto:${contactEmail}?subject=${encodeURIComponent(`Hi ${name}, I'm ready to get started`)}`} className="rounded-full bg-white px-5 py-2 text-xs font-medium shadow hover:shadow-md transition" style={{ color: brand }}>✉️ Email Me</a>}
              {shop && <a href={shop} target="_blank" rel="noreferrer" className="rounded-full border border-white/30 px-5 py-2 text-xs font-medium text-white hover:bg-white/10 transition">🛒 Products</a>}
            </div>
          </div>
        </section>
      </main>

      <script
        async
        src="/widget/chat.js"
        data-tenant={profile.slug}
        data-api-url={AI}
        data-primary-color={brand}
        data-accent-color={brand}
        data-autoopen="true"
        data-business-type={isFLP ? "flp" : "generic"}
        data-whatsapp={waReal ? waD : undefined}
        data-email={contactEmail || undefined}
        data-subtitle={isFLP ? `${name} · FBO Online` : undefined}
      />
      <script dangerouslySetInnerHTML={{ __html: `(function(){try{var s=${JSON.stringify(profile.slug)},a=${JSON.stringify(API)};var f=function(t,m){try{fetch(a+'/api/v1/public/profile-events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({slug:s,event_type:t,referrer:document.referrer,metadata:m||{}}),keepalive:true}).catch(function(){});}catch(e){}};f('page_view');document.addEventListener('click',function(e){var el=e.target;while(el&&el.nodeType===1){var h=el.getAttribute&&el.getAttribute('href');if(h){if(/wa\\.me/.test(h))return f('whatsapp_click');if(/cal/.test(h))return f('book_click');if(/shop\\.foreverliving/.test(h))return f('product_click',{href:h});if(/join\\.foreverliving/.test(h))return f('cta_click',{cta:'join'});}el=el.parentNode;}},true);}catch(e){}})();` }} />
      <footer className="border-t py-3 text-center text-[10px] text-gray-400">Powered by <a href={APP} className="font-medium hover:underline text-gray-500">MarketFlow</a></footer>
    </div>
  );
}

const PRODUCTS = [
  { code: "015", name: "Aloe Vera Gel", cc: "0.103", desc: "Pure stabilized inner leaf gel for digestive wellness and natural hydration.", img: "/images/public-profile/featured-products/aloe-vera-gel.jpg" },
  { code: "376", name: "Arctic Sea", cc: "0.163", desc: "Omega-3 DHA & EPA for heart health, brain function, and joint support.", img: "/images/public-profile/featured-products/artic-sea.jpg" },
  { code: "354", name: "Forever Kids", cc: "0.278", desc: "Chewable phytonutrient-rich multivitamins designed for growing children.", img: "/images/public-profile/featured-products/forever-kids.jpg" },
  { code: "284", name: "Avocado Soap", cc: "0.113", desc: "Moisturizing soap with natural avocado oil and aloe vera for soft, nourished skin.", img: "/images/public-profile/featured-products/avocado-soap.jpg" },
  { code: "028", name: "Bright Toothgel", cc: "0.080", desc: "Fluoride-free aloe vera toothgel for gentle whitening and lasting freshness.", img: "/images/public-profile/featured-products/tooth-gel.jpg" },
  { code: "067", name: "Forever Deodorant", cc: "0.088", desc: "Aluminum-free aloe vera deodorant for all-day freshness without harsh chemicals.", img: "/images/public-profile/featured-products/deordorant.jpg" },
  { code: "022", name: "Aloe Lips", cc: "0.046", desc: "Soothing aloe vera lip balm that moisturizes and protects lips all day long.", img: "/images/public-profile/featured-products/aloe-lips.jpg" },
];
