// Provider catalog — single source of truth for every third-party integration
// marketflow supports. Each provider declares its fields (with sensible prefilled
// defaults based on each vendor's documented public API), logo asset, and
// optional capabilities like `syncModels` (fetches available LLM models once
// the key is set) and `test` (sends a test notification).
//
// Logos are sourced from https://simpleicons.org/ (MIT-licensed brand icons)
// via the cdn.simpleicons.org delivery endpoint. No runtime SVG bundling.

export type FieldType =
  | "text"
  | "password"
  | "email"
  | "url"
  | "number"
  | "select"
  | "switch"
  | "textarea";

export interface ProviderField {
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  secret?: boolean;
  /** Prefilled on a fresh form; editable by the user. */
  default?: string;
  /** Placeholder shown in the input. */
  placeholder?: string;
  /** Short help text shown under the field. */
  help?: string;
  /** For type=select. */
  options?: { value: string; label: string }[];
  /** For type=number. */
  min?: number;
  max?: number;
}

export type ProviderScope = "platform" | "tenant";

export interface ProviderDef {
  /** Matches ProviderSetting.provider_name in the backend. */
  id: string;
  /** Matches ProviderSetting.provider_type. */
  type: string;
  /** Display name. */
  name: string;
  /** One-line description. */
  description: string;
  /** Where the provider config lives: platform-wide (shared secret) or per-tenant. */
  scope: ProviderScope;
  /** simpleicons.org slug, or absolute URL. */
  logoSlug?: string;
  /** Hex colour used to tint the logo. */
  logoColor?: string;
  /** Brand fallback colour when logo fails. */
  brandColor?: string;
  /** Link to the provider's docs / sign-up. */
  docsUrl?: string;
  /** Backend capability flags. */
  capabilities?: {
    /** Supports POST /admin/providers/sync-models to list available models. */
    syncModels?: boolean;
    /** Supports OAuth: redirects to provider then back. */
    oauth?: boolean;
    /** Supports POST /admin/providers/test to verify credentials work. */
    test?: boolean;
  };
  /** Which field keys are model selectors (become Select once sync-models runs). */
  modelFieldKeys?: string[];
  fields: ProviderField[];
}

export interface ProviderCategory {
  id: string;
  label: string;
  description: string;
  providers: ProviderDef[];
}

// ── AI providers (platform-wide) ──────────────────────────────────────────

const aiProviders: ProviderDef[] = [
  {
    id: "groq",
    type: "ai_llm",
    name: "Groq",
    description: "Fast Llama 3 / Mixtral inference. Free tier works for MVP.",
    scope: "platform",
    logoSlug: "groq",
    logoColor: "F55036",
    brandColor: "#F55036",
    docsUrl: "https://console.groq.com/keys",
    capabilities: { syncModels: true, test: true },
    modelFieldKeys: ["router_model", "main_model", "fallback_model"],
    fields: [
      {
        key: "api_key",
        label: "API key",
        type: "password",
        secret: true,
        required: true,
        placeholder: "gsk_…",
        help: "Starts with gsk_. Generate at console.groq.com/keys.",
      },
      {
        key: "base_url",
        label: "Base URL",
        type: "url",
        default: "https://api.groq.com/openai/v1",
      },
      {
        key: "router_model",
        label: "Router (classifier) model",
        type: "text",
        default: "openai/gpt-oss-20b",
        help: "Fast, small model for intent classification and the light tasks (public widget, prompt optimiser).",
      },
      {
        key: "main_model",
        label: "Responder model",
        type: "text",
        default: "openai/gpt-oss-120b",
      },
      {
        key: "fallback_model",
        label: "Fallback model",
        type: "text",
        default: "openai/gpt-oss-20b",
        help: "Groq retired the Llama and Gemma ids for pay as you go; old values are replaced automatically.",
      },
    ],
  },
  {
    id: "ollama",
    type: "ai_embed",
    name: "Ollama embeddings",
    description:
      "Cluster-local embeddings. Default URL points to the shared shared-infra pod.",
    scope: "platform",
    logoSlug: "ollama",
    logoColor: "000000",
    brandColor: "#111111",
    docsUrl: "https://ollama.com",
    capabilities: { syncModels: true, test: true },
    modelFieldKeys: ["embedding_model", "fallback_model"],
    fields: [
      {
        key: "base_url",
        label: "Base URL",
        type: "url",
        default: "http://ollama.shared-infra.svc.cluster.local:11434",
        help:
          "Cluster-internal DNS by default. Override with a public URL only for external / dev setups.",
      },
      {
        key: "embedding_model",
        label: "Embedding model",
        type: "text",
        default: "nomic-embed-text",
      },
      {
        key: "embedding_dim",
        label: "Embedding dimension",
        type: "number",
        default: "768",
      },
      {
        key: "fallback_model",
        label: "Fallback LLM (tool-calling)",
        type: "text",
        default: "llama3.1:8b",
      },
    ],
  },
  {
    id: "tavily",
    type: "ai_search",
    name: "Tavily web search",
    description: "LLM-friendly web search for the agentic RAG web_search tool.",
    scope: "platform",
    logoSlug: "tavily",
    logoColor: "0F172A",
    brandColor: "#0F172A",
    docsUrl: "https://app.tavily.com",
    capabilities: { test: true },
    fields: [
      {
        key: "api_key",
        label: "API key",
        type: "password",
        secret: true,
        required: true,
        placeholder: "tvly-…",
      },
      {
        key: "base_url",
        label: "Base URL",
        type: "url",
        default: "https://api.tavily.com",
      },
      {
        key: "daily_cap",
        label: "Per-tenant daily cap",
        type: "number",
        default: "20",
        min: 1,
        help: "Max web_search calls per tenant per day (Redis counter).",
      },
    ],
  },
  {
    id: "custom_search",
    type: "ai_search",
    name: "Google Custom Search",
    description:
      "Primary web search for the agentic RAG. 100 free queries/day; $5 per 1000 after.",
    scope: "platform",
    logoSlug: "google",
    logoColor: "4285F4",
    brandColor: "#4285F4",
    docsUrl: "https://developers.google.com/custom-search/v1/overview",
    capabilities: { test: true },
    fields: [
      {
        key: "api_key",
        label: "Google API key",
        type: "password",
        secret: true,
        required: true,
        placeholder: "AIza…",
        help: "Enable 'Custom Search API' in Google Cloud Console.",
      },
      {
        key: "cse_id",
        label: "Programmable Search Engine ID",
        type: "text",
        required: true,
        placeholder: "0123456789abc:xyz",
        help: "Create at programmablesearchengine.google.com; set 'Search the entire web' ON.",
      },
      {
        key: "daily_cap",
        label: "Per-tenant daily cap",
        type: "number",
        default: "80",
        min: 1,
        help: "Keep below 100 to stay within the free tier (shared across all tenants).",
      },
    ],
  },
  {
    id: "openai",
    type: "ai_llm",
    name: "OpenAI (optional fallback)",
    description: "GPT-4o / GPT-4.1 as a premium fallback.",
    scope: "platform",
    logoSlug: "openai",
    logoColor: "412991",
    brandColor: "#412991",
    docsUrl: "https://platform.openai.com/api-keys",
    capabilities: { syncModels: true, test: true },
    modelFieldKeys: ["main_model"],
    fields: [
      { key: "api_key", label: "API key", type: "password", secret: true, required: true, placeholder: "sk-…" },
      { key: "base_url", label: "Base URL", type: "url", default: "https://api.openai.com/v1" },
      { key: "main_model", label: "Model", type: "text", default: "gpt-4o-mini" },
    ],
  },
  {
    id: "anthropic",
    type: "ai_llm",
    name: "Anthropic Claude",
    description: "Premium writing for the Marketing OS: Haiku for copy and briefs, Sonnet for campaign strategy.",
    scope: "platform",
    logoSlug: "anthropic",
    logoColor: "191919",
    brandColor: "#191919",
    docsUrl: "https://console.anthropic.com/settings/keys",
    capabilities: { syncModels: true, test: true },
    modelFieldKeys: ["main_model"],
    fields: [
      { key: "api_key", label: "API key", type: "password", secret: true, required: true, placeholder: "sk-ant-…" },
      { key: "base_url", label: "Base URL", type: "url", default: "https://api.anthropic.com/v1" },
      { key: "main_model", label: "Model", type: "text", default: "claude-haiku-5-5" },
    ],
  },
  {
    id: "typesafe",
    type: "decide",
    name: "TypeSafe Jev (decisions)",
    description:
      "Cheap typed decisions (choice, score, yes or no) that route requests, shortlist ads and review copy before any premium model runs.",
    scope: "platform",
    brandColor: "#334155",
    docsUrl: "https://typesafe.ai",
    fields: [
      { key: "api_key", label: "API key", type: "password", secret: true, required: true },
      { key: "base_url", label: "Base URL", type: "url", default: "https://api.typesafe.ai/v1" },
      { key: "model", label: "Model", type: "text", default: "jev-latest" },
    ],
  },
  {
    id: "policy",
    type: "ai_routing",
    name: "Model routing policy",
    description:
      "Which model serves each class (nano, standard, premium, premium_plus), decide thresholds and the monthly decide spend ceiling. Empty uses the built-in defaults.",
    scope: "platform",
    brandColor: "#0f766e",
    fields: [
      {
        key: "policy",
        label: "Policy (JSON)",
        type: "textarea",
        placeholder: '{"classes":{"premium":[{"provider":"anthropic","model":"claude-haiku-5-5"}]}}',
        help: "Merged over the defaults; only the classes you list change.",
      },
    ],
  },
  {
    id: "outputs",
    type: "ai_registry",
    name: "Output price registry",
    description:
      "Credit prices for every output (copy batch, poster, video tiers) and the cost-engine settings used by Creative Plan quotes. Empty uses the built-in registry.",
    scope: "platform",
    brandColor: "#7c3aed",
    fields: [
      {
        key: "registry",
        label: "Registry overrides (JSON)",
        type: "textarea",
        placeholder: '{"settings":{"fx_rate":129}}',
        help: "Merged over the built-in registry. Quotes recompute within five minutes.",
      },
    ],
  },
];

// ── Ad platforms (platform app credentials) ───────────────────────────────

const adProviders: ProviderDef[] = [
  {
    id: "oauth",
    type: "meta_ads",
    name: "Meta (Facebook + Instagram)",
    description:
      "Meta App used for lead-ads webhook + tenant Page OAuth. Tenants connect their own Page on /settings/integrations.",
    scope: "platform",
    logoSlug: "meta",
    logoColor: "0866FF",
    brandColor: "#0866FF",
    docsUrl: "https://developers.facebook.com/apps",
    capabilities: { test: true },
    fields: [
      { key: "app_id", label: "App ID", type: "text", required: true },
      { key: "app_secret", label: "App secret", type: "password", secret: true, required: true },
      {
        key: "verify_token",
        label: "Webhook verify token",
        type: "password",
        secret: true,
        required: true,
        help: "Matches the token you paste into Meta's webhook subscription UI.",
      },
      {
        key: "redirect_url",
        label: "OAuth redirect URL",
        type: "url",
        default: "https://marketflowapi.codevertexafrica.com/api/v1/integrations/meta/callback",
      },
      {
        key: "login_config_id",
        label: "Login for Business configuration ID",
        type: "text",
        help: "Optional. When set, tenants connect through this Facebook Login for Business configuration and its permissions replace the list below.",
      },
      {
        key: "scopes",
        label: "Permissions requested at connect",
        type: "text",
        default: "pages_show_list,pages_read_engagement,leads_retrieval,pages_manage_metadata",
        help: "Comma-separated. Add a permission only after Meta App Review approves it: Meta rejects the connect dialog for every tenant when it asks for an unapproved permission.",
      },
      {
        key: "graph_version",
        label: "Graph API version",
        type: "text",
        default: "v21.0",
      },
    ],
  },
  {
    id: "ads",
    type: "tiktok_ads",
    name: "TikTok for Business",
    description: "TikTok ad account + lead generation integration.",
    scope: "platform",
    logoSlug: "tiktok",
    logoColor: "000000",
    brandColor: "#25F4EE",
    docsUrl: "https://ads.tiktok.com/marketing_api/",
    capabilities: { test: true },
    fields: [
      { key: "app_id", label: "App ID", type: "text", required: true },
      { key: "app_secret", label: "App secret", type: "password", secret: true, required: true },
      {
        key: "redirect_url",
        label: "OAuth redirect URL",
        type: "url",
        default: "https://marketflowapi.codevertexafrica.com/api/v1/integrations/tiktok/callback",
      },
      {
        key: "base_url",
        label: "Base URL",
        type: "url",
        default: "https://business-api.tiktok.com/open_api/v1.3",
      },
    ],
  },
  {
    id: "ads",
    type: "google_ads",
    name: "Google Ads",
    description: "Google Ads OAuth + developer token.",
    scope: "platform",
    logoSlug: "google",
    logoColor: "4285F4",
    brandColor: "#4285F4",
    docsUrl: "https://developers.google.com/google-ads/api/docs/get-started/introduction",
    capabilities: { test: true },
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true, help: "OAuth 2.0 Client ID (…apps.googleusercontent.com)" },
      { key: "client_secret", label: "Client secret", type: "password", secret: true, required: true },
      {
        key: "developer_token",
        label: "Developer token",
        type: "password",
        secret: true,
        required: true,
        help: "Google Ads API developer token from the manager account.",
      },
      {
        key: "redirect_url",
        label: "OAuth redirect URL",
        type: "url",
        default: "https://marketflowapi.codevertexafrica.com/api/v1/integrations/google-ads/callback",
      },
      {
        key: "login_customer_id",
        label: "Login customer ID",
        type: "text",
        placeholder: "123-456-7890",
        help: "Manager account MCC. Optional for single-account setups.",
      },
    ],
  },
  {
    id: "ads",
    type: "linkedin_ads",
    name: "LinkedIn Ads",
    description: "LinkedIn Marketing API OAuth app.",
    scope: "platform",
    logoSlug: "linkedin",
    logoColor: "0A66C2",
    brandColor: "#0A66C2",
    docsUrl: "https://learn.microsoft.com/en-us/linkedin/marketing/",
    capabilities: { test: true },
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client secret", type: "password", secret: true, required: true },
      {
        key: "redirect_url",
        label: "OAuth redirect URL",
        type: "url",
        default: "https://marketflowapi.codevertexafrica.com/api/v1/integrations/linkedin/callback",
      },
    ],
  },
  {
    id: "ads",
    type: "x_ads",
    name: "X (Twitter) Ads",
    description: "X Ads API v12 OAuth.",
    scope: "platform",
    logoSlug: "x",
    logoColor: "000000",
    brandColor: "#000000",
    docsUrl: "https://developer.x.com/en/docs/x-ads-api",
    capabilities: { test: true },
    fields: [
      { key: "consumer_key", label: "Consumer key", type: "password", secret: true, required: true },
      { key: "consumer_secret", label: "Consumer secret", type: "password", secret: true, required: true },
      {
        key: "redirect_url",
        label: "OAuth redirect URL",
        type: "url",
        default: "https://marketflowapi.codevertexafrica.com/api/v1/integrations/x/callback",
      },
    ],
  },
];

// ── Scheduling (platform OAuth client; tokens are per-tenant) ─────────────

const schedulingProviders: ProviderDef[] = [
  {
    id: "oauth",
    type: "google_calendar",
    name: "Google Calendar",
    description:
      "Platform-level OAuth client; each tenant then connects their own Google Calendar under /settings/integrations.",
    scope: "platform",
    logoSlug: "googlecalendar",
    logoColor: "4285F4",
    brandColor: "#4285F4",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    capabilities: { test: true },
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client secret", type: "password", secret: true, required: true },
      {
        key: "redirect_url",
        label: "OAuth redirect URL",
        type: "url",
        default: "https://marketflowapi.codevertexafrica.com/api/v1/integrations/google/callback",
      },
    ],
  },
];

// Email / SMS / WhatsApp / Push providers are NOT defined here — notifications-api
// owns every messaging channel for every SSO-integrated service. MarketFlow
// dispatches via notifications-api's HTTP + NATS interface (see
// marketflow-api/internal/notifications/client.go). Configure those vendors
// from the platform console at notifications.codevertexafrica.com/platform
// (deep-link exposed at /platform/messaging in this UI).

// ── Per-tenant integrations (shown on /settings/integrations) ─────────────
// These rely on platform-level OAuth clients defined above; per tenant they
// store a refresh_token / page_token, not the app secret.
export const tenantIntegrations: {
  id: string;
  name: string;
  description: string;
  logoSlug: string;
  logoColor: string;
  brandColor: string;
  requiresPlatformConfig: string; // platform provider_type that must be set first
  authorizePath: string;
}[] = [
  {
    id: "google_calendar",
    name: "Google Calendar",
    description: "Push scheduled meetings into your calendar with a Google Meet link.",
    logoSlug: "googlecalendar",
    logoColor: "4285F4",
    brandColor: "#4285F4",
    requiresPlatformConfig: "google_calendar",
    authorizePath: "/api/v1/integrations/google/authorize",
  },
  {
    id: "meta_ads",
    name: "Facebook / Instagram",
    description: "Receive leads from Meta Lead Ads straight into MarketFlow.",
    logoSlug: "meta",
    logoColor: "0866FF",
    brandColor: "#0866FF",
    requiresPlatformConfig: "meta_ads",
    authorizePath: "/api/v1/integrations/meta/authorize",
  },
  {
    id: "google_ads",
    name: "Google Ads",
    description: "Track leads + conversions from Google Ads campaigns.",
    logoSlug: "googleads",
    logoColor: "4285F4",
    brandColor: "#4285F4",
    requiresPlatformConfig: "google_ads",
    authorizePath: "/api/v1/integrations/google-ads/authorize",
  },
  {
    id: "tiktok_ads",
    name: "TikTok for Business",
    description: "Run and measure TikTok lead-gen campaigns.",
    logoSlug: "tiktok",
    logoColor: "000000",
    brandColor: "#25F4EE",
    requiresPlatformConfig: "tiktok_ads",
    authorizePath: "/api/v1/integrations/tiktok/authorize",
  },
  {
    id: "linkedin_ads",
    name: "LinkedIn Ads",
    description: "Sync LinkedIn Lead Gen Forms into MarketFlow.",
    logoSlug: "linkedin",
    logoColor: "0A66C2",
    brandColor: "#0A66C2",
    requiresPlatformConfig: "linkedin_ads",
    authorizePath: "/api/v1/integrations/linkedin/authorize",
  },
];

// ── Media generation (Creative Studio, platform-wide) ─────────────────────
// Saved as ProviderSetting media/<id>, key api_key; marketflow-ai reads them
// (internal/app/media.go). Routes and prices: marketflow docs,
// integrations/video-generation-providers.md (confirmed 2026-10-24).

const mediaProviders: ProviderDef[] = [
  {
    id: "fal",
    type: "media",
    name: "fal.ai",
    description:
      "Pay as you go. Poster images (Seedream, Nano Banana), talking presenters (VEED Fabric, Creatify Aurora), the voice fallback and video assembly.",
    scope: "platform",
    brandColor: "#5B21B6",
    docsUrl: "https://fal.ai/dashboard/keys",
    fields: [
      {
        key: "api_key",
        label: "API key",
        type: "password",
        secret: true,
        required: true,
        placeholder: "key-id:key-secret",
        help: "Keep a balance: generation fails at USD 0, and the router skips fal.ai when it is low.",
      },
    ],
  },
  {
    id: "higgsfield",
    type: "media",
    name: "Higgsfield",
    description:
      "Pay as you go. The video engine (Kling, Seedance, Wan, Hailuo) at lower per-second prices, and Recraft as the poster fallback.",
    scope: "platform",
    brandColor: "#84CC16",
    docsUrl: "https://console.higgsfield.ai",
    fields: [
      {
        key: "api_key",
        label: "API key",
        type: "password",
        secret: true,
        required: true,
        placeholder: "key-id:key-secret",
        help: "Keep a balance: generation fails at USD 0.",
      },
    ],
  },
  {
    id: "elevenlabs",
    type: "media",
    name: "ElevenLabs",
    description: "Voice-overs (eleven_v4_turbo, English by default, Swahili when asked) and music beds.",
    scope: "platform",
    logoSlug: "elevenlabs",
    logoColor: "000000",
    brandColor: "#000000",
    docsUrl: "https://elevenlabs.io/app/settings/api-keys",
    fields: [
      {
        key: "api_key",
        label: "API key",
        type: "password",
        secret: true,
        required: true,
        help: "Needs a paid plan: free-plan audio can never be used in ads, even after upgrading.",
      },
    ],
  },
  {
    id: "creatomate",
    type: "media",
    name: "Creatomate (optional)",
    description: "Designed templates for premium posters and videos. Subscription only, so it is off the default path.",
    scope: "platform",
    brandColor: "#2563EB",
    docsUrl: "https://creatomate.com/docs/api/introduction",
    fields: [{ key: "api_key", label: "API key", type: "password", secret: true }],
  },
];

// ── Categorised export for the Platform UI ────────────────────────────────

export const providerCatalog: ProviderCategory[] = [
  {
    id: "ai",
    label: "AI & intelligence",
    description: "Language models, embeddings, and live web search used by agentic RAG.",
    providers: aiProviders,
  },
  {
    id: "ads",
    label: "Advertising platforms",
    description: "OAuth clients for Meta, TikTok, Google Ads, LinkedIn Ads, X.",
    providers: adProviders,
  },
  {
    id: "media",
    label: "Media generation",
    description: "Creative Studio providers: images, video, voice and assembly. Pay as you go first.",
    providers: mediaProviders,
  },
  {
    id: "scheduling",
    label: "Scheduling",
    description: "Google Calendar integration defaults.",
    providers: schedulingProviders,
  },
  // Messaging (Email / SMS / WhatsApp / Push) is centrally configured in
  // notifications-api. Use the deep-link at /platform/messaging.
];

// ── Logo helper ───────────────────────────────────────────────────────────

/** Builds the simpleicons.org CDN URL for a brand logo. */
export function logoUrl(slug?: string, color?: string, size = 48): string {
  if (!slug) return "";
  const colorPart = color ? `/${color}` : "";
  return `https://cdn.simpleicons.org/${slug}${colorPart}`;
}

export function findProvider(type: string, id: string): ProviderDef | undefined {
  for (const cat of providerCatalog) {
    for (const p of cat.providers) {
      if (p.type === type && p.id === id) return p;
    }
  }
  return undefined;
}
