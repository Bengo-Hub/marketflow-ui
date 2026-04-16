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
    /** Supports a test-connection call. */
    test?: boolean;
  };
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
    capabilities: { syncModels: true },
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
        default: "llama-3.1-8b-instant",
        help: "Fast, small model used for intent classification.",
      },
      {
        key: "main_model",
        label: "Responder model",
        type: "text",
        default: "llama-3.3-70b-versatile",
      },
      {
        key: "fallback_model",
        label: "Fallback model",
        type: "text",
        default: "gemma2-9b-it",
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
    id: "openai",
    type: "ai_llm",
    name: "OpenAI (optional fallback)",
    description: "GPT-4o / GPT-4.1 as a premium fallback.",
    scope: "platform",
    logoSlug: "openai",
    logoColor: "412991",
    brandColor: "#412991",
    docsUrl: "https://platform.openai.com/api-keys",
    capabilities: { syncModels: true },
    fields: [
      { key: "api_key", label: "API key", type: "password", secret: true, required: true, placeholder: "sk-…" },
      { key: "base_url", label: "Base URL", type: "url", default: "https://api.openai.com/v1" },
      { key: "main_model", label: "Model", type: "text", default: "gpt-4o-mini" },
    ],
  },
  {
    id: "anthropic",
    type: "ai_llm",
    name: "Anthropic Claude (optional fallback)",
    description: "Claude Haiku / Sonnet as premium fallback for long-form tasks.",
    scope: "platform",
    logoSlug: "anthropic",
    logoColor: "191919",
    brandColor: "#191919",
    docsUrl: "https://console.anthropic.com/settings/keys",
    capabilities: { syncModels: true },
    fields: [
      { key: "api_key", label: "API key", type: "password", secret: true, required: true, placeholder: "sk-ant-…" },
      { key: "base_url", label: "Base URL", type: "url", default: "https://api.anthropic.com/v1" },
      { key: "main_model", label: "Model", type: "text", default: "claude-haiku-4-5" },
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
        default: "https://marketflowapi.codevertexitsolutions.com/api/v1/integrations/meta/callback",
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
    fields: [
      { key: "app_id", label: "App ID", type: "text", required: true },
      { key: "app_secret", label: "App secret", type: "password", secret: true, required: true },
      {
        key: "redirect_url",
        label: "OAuth redirect URL",
        type: "url",
        default: "https://marketflowapi.codevertexitsolutions.com/api/v1/integrations/tiktok/callback",
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
        default: "https://marketflowapi.codevertexitsolutions.com/api/v1/integrations/google-ads/callback",
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
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client secret", type: "password", secret: true, required: true },
      {
        key: "redirect_url",
        label: "OAuth redirect URL",
        type: "url",
        default: "https://marketflowapi.codevertexitsolutions.com/api/v1/integrations/linkedin/callback",
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
    fields: [
      { key: "consumer_key", label: "Consumer key", type: "password", secret: true, required: true },
      { key: "consumer_secret", label: "Consumer secret", type: "password", secret: true, required: true },
      {
        key: "redirect_url",
        label: "OAuth redirect URL",
        type: "url",
        default: "https://marketflowapi.codevertexitsolutions.com/api/v1/integrations/x/callback",
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
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true },
      { key: "client_secret", label: "Client secret", type: "password", secret: true, required: true },
      {
        key: "redirect_url",
        label: "OAuth redirect URL",
        type: "url",
        default: "https://marketflowapi.codevertexitsolutions.com/api/v1/integrations/google/callback",
      },
    ],
  },
  {
    id: "default",
    type: "calcom",
    name: "Cal.com",
    description: "Optional embedded scheduler — hosted at cal.com or self-hosted.",
    scope: "platform",
    logoSlug: "caldotcom",
    logoColor: "111827",
    brandColor: "#111827",
    docsUrl: "https://cal.com/docs/api-reference",
    fields: [
      { key: "base_url", label: "Base URL", type: "url", default: "https://api.cal.com/v2" },
      { key: "api_key", label: "API key", type: "password", secret: true, required: true },
      { key: "webhook_secret", label: "Webhook secret", type: "password", secret: true },
    ],
  },
];

// ── Messaging providers (delegated to notifications-api) ─────────────────

const messagingProviders: ProviderDef[] = [
  {
    id: "meta",
    type: "whatsapp",
    name: "WhatsApp (Meta Cloud API)",
    description: "WhatsApp Business Cloud API via Meta.",
    scope: "platform",
    logoSlug: "whatsapp",
    logoColor: "25D366",
    brandColor: "#25D366",
    docsUrl: "https://developers.facebook.com/docs/whatsapp/cloud-api",
    fields: [
      { key: "phone_number_id", label: "Phone number ID", type: "text", required: true },
      { key: "business_account_id", label: "WABA ID", type: "text", required: true },
      { key: "access_token", label: "System-user access token", type: "password", secret: true, required: true },
      { key: "base_url", label: "Base URL", type: "url", default: "https://graph.facebook.com/v21.0" },
    ],
  },
  {
    id: "brevo",
    type: "email",
    name: "Brevo (Sendinblue)",
    description: "Transactional email.",
    scope: "platform",
    logoSlug: "sendinblue",
    logoColor: "0B996E",
    brandColor: "#0B996E",
    docsUrl: "https://app.brevo.com",
    fields: [
      { key: "api_key", label: "API key", type: "password", secret: true, required: true, placeholder: "xkeysib-…" },
      { key: "base_url", label: "Base URL", type: "url", default: "https://api.brevo.com/v3" },
      { key: "sender_email", label: "From email", type: "email", required: true },
      { key: "sender_name", label: "From name", type: "text" },
    ],
  },
  {
    id: "sendgrid",
    type: "email",
    name: "SendGrid",
    description: "Transactional email.",
    scope: "platform",
    logoSlug: "twilio",
    logoColor: "1A82E2",
    brandColor: "#1A82E2",
    docsUrl: "https://app.sendgrid.com/settings/api_keys",
    fields: [
      { key: "api_key", label: "API key", type: "password", secret: true, required: true, placeholder: "SG.…" },
      { key: "sender_email", label: "From email", type: "email", required: true },
      { key: "sender_name", label: "From name", type: "text" },
    ],
  },
  {
    id: "twilio",
    type: "sms",
    name: "Twilio SMS",
    description: "SMS via Twilio.",
    scope: "platform",
    logoSlug: "twilio",
    logoColor: "F22F46",
    brandColor: "#F22F46",
    docsUrl: "https://console.twilio.com",
    fields: [
      { key: "account_sid", label: "Account SID", type: "text", required: true, placeholder: "ACxxxx" },
      { key: "auth_token", label: "Auth token", type: "password", secret: true, required: true },
      { key: "from_number", label: "From number", type: "text", required: true, placeholder: "+1234567890" },
    ],
  },
  {
    id: "africastalking",
    type: "sms",
    name: "Africa's Talking",
    description: "SMS for African markets.",
    scope: "platform",
    logoSlug: "africastalking",
    logoColor: "F24E1E",
    brandColor: "#F24E1E",
    docsUrl: "https://account.africastalking.com",
    fields: [
      { key: "username", label: "Username", type: "text", required: true },
      { key: "api_key", label: "API key", type: "password", secret: true, required: true },
      { key: "sender_id", label: "Sender ID", type: "text", placeholder: "MARKETFLOW" },
    ],
  },
];

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
    id: "scheduling",
    label: "Scheduling",
    description: "Google Calendar + Cal.com integration defaults.",
    providers: schedulingProviders,
  },
  {
    id: "messaging",
    label: "Messaging (via notifications-api)",
    description:
      "Email / SMS / WhatsApp providers. These are mirrored from notifications-api's provider store — configure them there.",
    providers: messagingProviders,
  },
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
