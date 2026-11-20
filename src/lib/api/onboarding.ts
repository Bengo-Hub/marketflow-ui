import { apiClient } from "./client";
import type { BrandContext } from "./marketing-os";

/** forever_shop is the Forever tenant's step only; no tenant has a products step (owner, 2026-11-03). */
export type StepKey =
  | "plan"
  | "profile"
  | "forever_shop"
  | "brand_context"
  | "brand_images"
  | "channels"
  | "lead_capture"
  | "widget"
  | "share_page"
  | "team";

/** The quick start steps the owner marks done in the guide (marketflow-api onboarding quick_start.go). */
export type MarkableStep = "plan" | "widget" | "share_page";

/** GET /api/v1/tenant/onboarding (marketflow-api onboarding.Checklist). Done and total count required steps. */
export interface Checklist {
  steps: { key: StepKey; done: boolean; optional?: boolean }[];
  done: number;
  total: number;
  complete: boolean;
  dismissed: boolean;
}

/** A product or service from the business's own data, ready to add to the public page. */
export interface OfferingSuggestion {
  name: string;
  description?: string;
  price_label?: string;
  image_url?: string;
  url?: string;
  /** pos: a best seller; inventory: from the catalogue; website and course: the platform tenant's site. */
  source: "pos" | "inventory" | "website" | "course";
  quantity_sold?: number;
}

/** GET /api/v1/tenant/marketing-context/draft. Nothing is saved until the owner saves. */
export interface BrandDraft {
  current: BrandContext;
  /** current with only its empty fields filled. */
  suggested: BrandContext;
  offerings: OfferingSuggestion[];
  /** From the account (auth-api), only where the MarketFlow profile has nothing yet. */
  profile: {
    contact_email?: string;
    whatsapp_number?: string;
    logo_url?: string;
    website?: string;
    brand_primary_color?: string;
    /** A Forever Living seller with no address gets the platform default prefilled. */
    business_address?: string;
  };
  /** Which sources answered: profile, account, catalogue, website. */
  sources: string[];
}

export const onboardingApi = {
  checklist: () => apiClient.get<Checklist>("/api/v1/tenant/onboarding").then((r) => ({ ...r.data, steps: r.data.steps ?? [] })),
  dismiss: (dismissed: boolean) => apiClient.post("/api/v1/tenant/onboarding/dismiss", { dismissed }).then(() => undefined),
  /** Marks a quick start step done: stay on the trial, the widget added, the page shared. */
  markStep: (key: MarkableStep) => apiClient.post(`/api/v1/tenant/onboarding/steps/${key}/done`).then(() => undefined),
  draft: () =>
    apiClient.get<BrandDraft>("/api/v1/tenant/marketing-context/draft").then((r) => ({
      ...r.data,
      offerings: r.data.offerings ?? [],
      sources: r.data.sources ?? [],
      profile: r.data.profile ?? {},
    })),
};

/** Where each step is finished in the app, relative to /{orgSlug}. */
export const STEP_META: Record<StepKey, { title: string; blurb: string; href: string; action: string }> = {
  plan: {
    title: "Choose your plan",
    blurb: "You start on a free trial. Pick the plan that fits your business now, or stay on the trial and choose later.",
    href: "/settings/billing",
    action: "See plans",
  },
  widget: {
    title: "Add the chat assistant to your website",
    blurb: "Optional. Paste one line into your site and visitors can ask questions and leave their details any time.",
    href: "/settings/integrations",
    action: "Get the code",
  },
  share_page: {
    title: "Share your page",
    blurb: "Optional. Send your public page to customers on WhatsApp and your social pages, so leads start coming in.",
    href: "/settings/profile",
    action: "Share",
  },
  profile: {
    title: "Tell customers who you are",
    blurb: "A tagline, a short story and how to reach you. It fills your public page.",
    href: "/settings/profile",
    action: "Edit profile",
  },
  forever_shop: {
    title: "Link your Forever shop",
    blurb: "Add your distributor ID. Every Forever product on your page then opens in your own Forever shop.",
    href: "/settings/profile",
    action: "Add distributor ID",
  },
  brand_context: {
    title: "Brief your marketing team",
    blurb: "Who you sell to, what you sell and how you sound. Every post and ad starts here.",
    href: "/settings/marketing-context",
    action: "Set brand context",
  },
  brand_images: {
    title: "Add pictures of your business",
    blurb: "Three to five photos of your shop, your team or your products in use. Video ads need them. Only your business can see them.",
    href: "/settings/marketing-context",
    action: "Add pictures",
  },
  channels: {
    title: "Connect a channel",
    blurb: "Your WhatsApp number, or a Facebook page, so leads can reach you.",
    href: "/settings/integrations",
    action: "Connect",
  },
  lead_capture: {
    title: "Start capturing leads",
    blurb: "Publish a funnel, or share your public page, and your first lead lands here.",
    href: "/funnels",
    action: "Create a funnel",
  },
  team: {
    title: "Invite your team",
    blurb: "Optional. Add people who help you sell.",
    href: "/settings/team",
    action: "Invite",
  },
};
