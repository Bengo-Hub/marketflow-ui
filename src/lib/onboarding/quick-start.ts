import { AI_API_URL, APP_URL, PRICING_URL } from "@/lib/urls";

/**
 * The setup guide's quick start steps (Sprint 6): choose a plan, put the chat widget on the
 * business's website, share the public page. marketflow-api marks each done from data where it
 * can (a paid plan, a lead from the widget's form) or when the owner taps the step's button.
 */

/**
 * Where plans are chosen: the platform's pricing site, the same link as Billing's Change plan.
 * only=1 shows the MarketFlow plans alone, without the other products' tabs.
 */
export function plansHref(): string {
  return `${PRICING_URL}/plans?service=marketflow&only=1`;
}

/** Only a slug is put into the snippet; anything else is left out rather than escaped. */
const slugRe = /^[a-z0-9][a-z0-9-]{0,62}$/;

/** The widget's embed snippet for the business, as in public/widget/README.md. */
export function widgetSnippet(slug: string, primaryColor?: string): string {
  const tenant = slugRe.test(slug) ? slug : "YOUR_TENANT_SLUG";
  const color = /^#[0-9a-f]{6}$/i.test(primaryColor ?? "") ? primaryColor : "#9100B0";
  return [
    "<script",
    `  src="${APP_URL}/widget/chat.js"`,
    `  data-tenant="${tenant}"`,
    `  data-api-url="${AI_API_URL}"`,
    `  data-primary-color="${color}"`,
    "  async></script>",
  ].join("\n");
}

/** A WhatsApp share of the page with a short line, opened in WhatsApp or WhatsApp Web. */
export function whatsappShareHref(url: string, businessName?: string): string {
  const name = businessName?.trim();
  const text = name ? `See what ${name} offers: ${url}` : url;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
