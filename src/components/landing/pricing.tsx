import { PRICING_URL } from "@/lib/urls";

const PLANS_API = (
  process.env.SUBSCRIPTION_BASE_URL ||
  process.env.NEXT_PUBLIC_SUBSCRIPTIONS_API_URL ||
  "https://pricingapi.codevertexafrica.com"
).replace(/\/$/, "");

/** Feature codes that mean a plan includes MarketFlow (subscriptions-api feature catalog). */
const MARKETFLOW_FEATURES = new Set([
  "lead_management",
  "contact_management",
  "ai_chat_agent",
  "basic_campaigns",
  "funnel_builder",
  "email_sequences",
  "deal_pipeline",
]);

type Plan = {
  name: string;
  basePrice: number;
  currency: string;
  billingCycle: string;
  isPublic: boolean;
  features?: Array<{ featureCode?: string; code?: string } | string>;
};

type Offer = { price: number; currency: string; plan: string; families: string[] };

/**
 * MarketFlow has no plans of its own: it comes with PowerSuite and ERP plans. The figure shown is
 * the cheapest public monthly plan that includes it, read live from the subscriptions API (cached
 * for an hour), so the page never shows a price that does not exist.
 */
async function cheapestOffer(): Promise<Offer | null> {
  try {
    const res = await fetch(`${PLANS_API}/api/v1/plans?active=true&limit=200`, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    const body = (await res.json()) as { data?: Plan[] };
    const plans = (body.data ?? []).filter(
      (p) =>
        p.isPublic &&
        p.billingCycle === "MONTHLY" &&
        p.basePrice > 0 &&
        (p.features ?? []).some((f) => MARKETFLOW_FEATURES.has(typeof f === "string" ? f : f.featureCode ?? f.code ?? "")),
    );
    if (plans.length === 0) return null;
    plans.sort((a, b) => a.basePrice - b.basePrice);
    const families = Array.from(new Set(plans.map((p) => p.name.split(/\s[—-]\s/)[0].trim()))).slice(0, 6);
    return { price: plans[0].basePrice, currency: plans[0].currency, plan: plans[0].name, families };
  } catch {
    return null;
  }
}

export async function Pricing() {
  const offer = await cheapestOffer();
  const price = offer ? new Intl.NumberFormat("en-KE").format(offer.price) : null;
  return (
    <section id="pricing" className="scroll-mt-20 mx-auto max-w-6xl px-4 pb-16 sm:px-6 lg:pb-24">
      <div className="glass grid gap-8 rounded-[1.75rem] p-7 sm:p-10 md:grid-cols-[1.2fr_1fr] md:items-center">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight sm:text-4xl">Included with Codevertex plans</h2>
          <p className="mt-3 max-w-xl text-lg text-muted-foreground">
            MarketFlow comes with Codevertex PowerSuite and ERP plans, alongside your sales, stock and books. AI
            features use prepaid credits, so you only pay for what you run.
          </p>
          {offer && offer.families.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {offer.families.map((f) => (
                <li key={f} className="rounded-full bg-accent px-3 py-1 text-sm font-medium text-accent-foreground">
                  {f}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="rounded-[1.25rem] bg-background/70 p-6">
          {price ? (
            <>
              <p className="text-sm text-muted-foreground">Plans that include MarketFlow start at</p>
              <p className="mt-1 font-display text-4xl font-semibold tracking-tight tabular">
                {offer!.currency} {price}
                <span className="ml-1.5 text-base font-medium text-muted-foreground">a month</span>
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{offer!.plan}</p>
            </>
          ) : (
            <p className="text-base text-muted-foreground">See current plans and prices on the Codevertex pricing site.</p>
          )}
          <a
            href={PRICING_URL}
            className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-dark"
          >
            Compare plans
          </a>
        </div>
      </div>
    </section>
  );
}
