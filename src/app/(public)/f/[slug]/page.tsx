import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FunnelForm } from "./funnel-form";
import { BookingWidget } from "@/components/booking/booking-widget";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://marketflowapi.codevertexitsolutions.com";

type FunnelStep = {
  id?: string;
  title?: string;
  description?: string;
  cta_text?: string;
  cta_url?: string;
  block_type?: "form" | "whatsapp" | "product" | "recruit" | "google_calendar" | "content";
  fields?: Array<{
    key: string;
    label: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
  }>;
  // block-specific props
  product_code?: string;
  product_name?: string;
  product_image?: string;
  product_price?: string;
  product_cc?: string;
  whatsapp_message?: string;
};

type Funnel = {
  id: string;
  tenant_id: string;
  tenant_slug: string;
  name: string;
  slug: string;
  description?: string;
  headline?: string;
  subheadline?: string;
  funnel_type?: string;
  content_json?: {
    steps?: FunnelStep[];
    theme?: {
      brand_color?: string;
      hero_image_url?: string;
    };
  };
  landing_page_html?: string;
};

type TenantProfile = {
  whatsapp_number?: string;
  fbo_distrib_id?: string;
  flp_store_code?: string;
  flp_language?: string;
  name?: string;
  slug?: string;
};

async function getFunnel(slug: string): Promise<Funnel | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/public/funnels/${slug}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

async function getTenantProfile(slug: string): Promise<TenantProfile | null> {
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

function buildShopLink(p: TenantProfile, itemCode?: string): string {
  const store = p.flp_store_code ?? "KEN";
  const lang = p.flp_language ?? "en";
  const did = p.fbo_distrib_id ?? "";
  const base = `https://shop.foreverliving.com/retail/entry/Shop.do?store=${store}&language=${lang}&distribID=${did}`;
  return itemCode ? `${base}&itemCode=${itemCode}` : base;
}

function buildRecruitLink(p: TenantProfile): string {
  const store = p.flp_store_code ?? "KEN";
  const lang = p.flp_language ?? "en";
  const did = p.fbo_distrib_id ?? "";
  return `https://join.foreverliving.com/marketing/joinnow/applicationForm.do?action=display&store=${store}&distribID=${did}&menuoff=n&langID=${lang}`;
}

function buildWhatsAppLink(p: TenantProfile, message?: string): string {
  const digits = (p.whatsapp_number ?? "").replace(/[^0-9]/g, "");
  const msg = message ?? `Hi${p.name ? " " + p.name : ""}, I'm interested in learning more.`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const f = await getFunnel(slug);
  if (!f) return { title: "Funnel not found" };
  return {
    title: f.name,
    description: f.description ?? f.subheadline ?? f.name,
    openGraph: {
      title: f.name,
      description: f.description ?? f.subheadline ?? f.name,
    },
  };
}

export default async function PublicFunnelPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const f = await getFunnel(slug);
  if (!f) notFound();

  // If the funnel has pre-rendered HTML from the builder, trust it.
  if (f.landing_page_html && f.landing_page_html.trim().length > 0) {
    return (
      <div
        className="min-h-screen"
        dangerouslySetInnerHTML={{ __html: f.landing_page_html }}
      />
    );
  }

  const steps = f.content_json?.steps ?? [];
  const brandColor = f.content_json?.theme?.brand_color ?? "#0A66C2";
  const hero = f.content_json?.theme?.hero_image_url;
  const firstForm = steps.find(
    (s) => (s.block_type === "form" || !s.block_type) && (s.fields?.length ?? 0) > 0,
  );

  // Tenant profile feeds into wa.me / product / recruit blocks so we don't
  // need per-block credentials on the funnel record.
  const profile = await getTenantProfile(f.tenant_slug);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <div
        className="h-1.5 w-full"
        style={{ background: brandColor }}
        aria-hidden
      />
      <main className="mx-auto max-w-4xl px-6 py-12 md:py-20">
        <header className="text-center">
          <h1 className="text-3xl font-bold tracking-tight md:text-5xl">
            {f.headline ?? f.name}
          </h1>
          {f.subheadline && (
            <p className="mt-4 text-lg text-muted-foreground md:text-xl">
              {f.subheadline}
            </p>
          )}
        </header>

        {hero && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero}
            alt=""
            className="mt-10 w-full rounded-2xl object-cover shadow-lg"
          />
        )}

        {steps
          .filter((s) => s !== firstForm)
          .map((step, i) => (
            <FunnelBlock
              key={step.id ?? `step-${i}`}
              step={step}
              brandColor={brandColor}
              profile={profile}
              tenantSlug={f.tenant_slug}
            />
          ))}

        {firstForm && (
          <FunnelForm
            tenantSlug={f.tenant_slug}
            step={firstForm}
            brandColor={brandColor}
          />
        )}

        <footer className="mt-16 text-center text-xs text-muted-foreground">
          Powered by MarketFlow
        </footer>
      </main>
    </div>
  );
}

function FunnelBlock({
  step,
  brandColor,
  profile,
  tenantSlug,
}: {
  step: FunnelStep;
  brandColor: string;
  profile: TenantProfile | null;
  tenantSlug: string;
}) {
  const blockType = step.block_type ?? "content";

  if (blockType === "whatsapp" && profile) {
    const href = buildWhatsAppLink(profile, step.whatsapp_message);
    return (
      <section className="mt-10 rounded-2xl border bg-white p-8 shadow-sm">
        {step.title && <h2 className="text-xl font-semibold">{step.title}</h2>}
        {step.description && (
          <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
        )}
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#25D366] px-6 py-2.5 text-sm font-medium text-white"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M20.52 3.45A11.84 11.84 0 0012.05 0C5.5 0 .2 5.31.2 11.87a11.8 11.8 0 001.6 5.94L0 24l6.33-1.75a11.85 11.85 0 005.72 1.46h.01c6.55 0 11.87-5.31 11.87-11.87a11.8 11.8 0 00-3.41-8.39zM12.06 21.7h-.01a9.86 9.86 0 01-5.03-1.37l-.36-.22-3.76 1.04 1-3.66-.24-.38a9.82 9.82 0 01-1.51-5.24c0-5.44 4.43-9.87 9.88-9.87a9.8 9.8 0 016.98 2.89 9.8 9.8 0 012.89 6.98c0 5.44-4.43 9.87-9.88 9.87zm5.43-7.39c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15s-.77.97-.94 1.17c-.17.2-.35.22-.65.07s-1.25-.46-2.39-1.47a8.97 8.97 0 01-1.66-2.06c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52s.2-.3.3-.5c.1-.2.05-.37-.02-.52-.07-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37s-1.05 1.03-1.05 2.5 1.07 2.9 1.22 3.1c.15.2 2.1 3.21 5.08 4.5.71.31 1.26.5 1.69.64.71.23 1.36.2 1.87.12.57-.08 1.76-.72 2.01-1.41s.25-1.29.17-1.41c-.07-.13-.27-.2-.57-.35z"/>
          </svg>
          {step.cta_text ?? "Chat on WhatsApp"}
        </a>
      </section>
    );
  }

  if (blockType === "product" && profile) {
    const href = buildShopLink(profile, step.product_code);
    return (
      <section className="mt-10 rounded-2xl border bg-white p-6 shadow-sm md:flex md:items-center md:gap-6 md:p-8">
        {step.product_image && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={step.product_image}
            alt={step.product_name ?? ""}
            className="h-40 w-40 rounded-xl object-cover md:h-48 md:w-48"
          />
        )}
        <div className="mt-4 flex-1 md:mt-0">
          <h2 className="text-xl font-semibold">
            {step.product_name ?? step.title ?? "Featured product"}
          </h2>
          {step.description && (
            <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
          )}
          <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {step.product_price && <span className="font-medium text-foreground">{step.product_price}</span>}
            {step.product_cc && <span>CC {step.product_cc}</span>}
            {step.product_code && <span className="text-xs">#{step.product_code}</span>}
          </div>
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-medium text-white"
            style={{ background: brandColor }}
          >
            {step.cta_text ?? "Buy now"}
          </a>
        </div>
      </section>
    );
  }

  if (blockType === "recruit" && profile) {
    const href = buildRecruitLink(profile);
    return (
      <section className="mt-10 rounded-2xl border bg-white p-8 shadow-sm">
        {step.title && <h2 className="text-xl font-semibold">{step.title}</h2>}
        {step.description && (
          <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
        )}
        <a
          href={href}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-medium text-white"
          style={{ background: brandColor }}
        >
          {step.cta_text ?? "Join my team"}
        </a>
      </section>
    );
  }

  if (blockType === "google_calendar") {
    return (
      <section className="mt-10">
        {step.title && (
          <div className="mb-4">
            <h2 className="text-xl font-semibold">{step.title}</h2>
            {step.description && (
              <p className="mt-1 text-sm text-muted-foreground">{step.description}</p>
            )}
          </div>
        )}
        <BookingWidget tenantSlug={tenantSlug} brandColor={brandColor} />
      </section>
    );
  }

  // Default: content block with optional plain CTA.
  return (
    <section className="mt-10 rounded-2xl border bg-white p-8 shadow-sm">
      {step.title && <h2 className="text-xl font-semibold">{step.title}</h2>}
      {step.description && (
        <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
      )}
      {step.cta_text && step.cta_url && (
        <a
          href={step.cta_url}
          className="mt-4 inline-block rounded-full px-6 py-2.5 text-sm font-medium text-white"
          style={{ background: brandColor }}
        >
          {step.cta_text}
        </a>
      )}
    </section>
  );
}
