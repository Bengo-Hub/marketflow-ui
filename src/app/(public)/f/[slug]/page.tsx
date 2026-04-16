import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FunnelForm } from "./funnel-form";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ||
  "https://marketflowapi.codevertexitsolutions.com";

type FunnelStep = {
  id?: string;
  title?: string;
  description?: string;
  cta_text?: string;
  cta_url?: string;
  fields?: Array<{
    key: string;
    label: string;
    type?: string;
    required?: boolean;
    placeholder?: string;
  }>;
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
  const firstForm = steps.find((s) => (s.fields?.length ?? 0) > 0);

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
          .filter((s) => !s.fields || s.fields.length === 0)
          .map((step, i) => (
            <section
              key={step.id ?? `step-${i}`}
              className="mt-10 rounded-2xl border bg-white p-8 shadow-sm"
            >
              {step.title && (
                <h2 className="text-xl font-semibold">{step.title}</h2>
              )}
              {step.description && (
                <p className="mt-2 text-sm text-muted-foreground">
                  {step.description}
                </p>
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
