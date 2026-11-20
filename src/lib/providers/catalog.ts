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
    /** Has a balance read by marketflow-ai's watcher (GET /admin/providers/balances). */
    balance?: boolean;
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
        placeholder: "openai/gpt-oss-20b",
        help: "Fast, small model for intent classification and the light tasks (public widget, prompt optimiser).",
      },
      {
        key: "main_model",
        label: "Responder model",
        type: "text",
        placeholder: "openai/gpt-oss-120b",
      },
      {
        key: "fallback_model",
        label: "Fallback model",
        type: "text",
        placeholder: "openai/gpt-oss-20b",
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
        placeholder: "nomic-embed-text",
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
        placeholder: "llama3.1:8b",
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
    id: "vertex_search",
    type: "ai_search",
    name: "Google Vertex AI Search",
    description:
      "Optional web search through a Vertex AI Search app (Discovery Engine). Tavily answers whenever it is not set up or fails.",
    scope: "platform",
    logoSlug: "googlecloud",
    logoColor: "4285F4",
    brandColor: "#4285F4",
    docsUrl: "https://cloud.google.com/generative-ai-app-builder/docs/try-enterprise-search",
    capabilities: { test: true },
    fields: [
      { key: "project_id", label: "Project ID", type: "text", required: true, placeholder: "my-project" },
      {
        key: "location",
        label: "Location",
        type: "select",
        default: "global",
        options: [
          { value: "global", label: "global" },
          { value: "us", label: "us (multi-region)" },
          { value: "eu", label: "eu (multi-region)" },
        ],
      },
      { key: "engine_id", label: "App (engine) ID", type: "text", required: true, help: "The search app's ID from AI Applications, Apps." },
      { key: "serving_config", label: "Serving config", type: "text", default: "default_search" },
      {
        key: "service_account_json",
        label: "Service account JSON",
        type: "textarea",
        secret: true,
        help: "A key for a service account with the Discovery Engine User role. Used with the search method.",
      },
      {
        key: "api_key",
        label: "API key",
        type: "password",
        secret: true,
        placeholder: "AIza…",
        help: "Only for an app on a public website data store (searchLite). The service account wins when both are set.",
      },
      { key: "daily_cap", label: "Per-tenant daily cap", type: "number", default: "100", min: 1 },
    ],
  },
  {
    id: "openai",
    type: "ai_llm",
    name: "OpenAI (optional fallback)",
    description: "A paid fallback in the standard and light classes. Sync models picks the newest mini and flagship models.",
    scope: "platform",
    logoSlug: "openai",
    logoColor: "412991",
    brandColor: "#412991",
    docsUrl: "https://platform.openai.com/api-keys",
    capabilities: { syncModels: true, test: true },
    modelFieldKeys: ["main_model", "premium_model"],
    fields: [
      { key: "api_key", label: "API key", type: "password", secret: true, required: true, placeholder: "sk-…" },
      { key: "base_url", label: "Base URL", type: "url", default: "https://api.openai.com/v1" },
      { key: "main_model", label: "Standard model", type: "text", help: "Used by the routing classes that list OpenAI. Run Sync models to pick the newest." },
      { key: "premium_model", label: "Premium model", type: "text", help: "For a routing policy that names @premium on OpenAI." },
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
    modelFieldKeys: ["main_model", "plus_model"],
    fields: [
      { key: "api_key", label: "API key", type: "password", secret: true, required: true, placeholder: "sk-ant-…" },
      { key: "base_url", label: "Base URL", type: "url", default: "https://api.anthropic.com/v1" },
      { key: "main_model", label: "Standard and premium model (Haiku)", type: "text", help: "The standard and premium classes use it." },
      { key: "plus_model", label: "Premium plus model (Sonnet)", type: "text", help: "The premium_plus class uses it." },
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
    capabilities: { test: true },
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
        placeholder: '{"classes":{"premium":[{"provider":"anthropic","model":"@premium"}]}}',
        help: "Merged over the defaults; only the classes you list change. Leave it empty to follow each provider's models: a model of \"\" is the provider's main model, and @fallback, @router and @premium name its other models, so Sync models moves the routing too. Prices per model family go under \"prices\".",
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
      "The Meta app for Facebook Login for Business, Pages, Instagram, Lead Ads and the Marketing API. Tenants connect their own Page on /settings/integrations. In the Meta app set: privacy policy https://accounts.codevertexafrica.com/privacy, terms https://accounts.codevertexafrica.com/terms-of-service, data deletion callback https://marketflowapi.codevertexafrica.com/api/v1/integrations/meta/data-deletion, deauthorize callback https://marketflowapi.codevertexafrica.com/api/v1/integrations/meta/deauthorize, lead webhook https://marketflowapi.codevertexafrica.com/api/v1/webhooks/meta/leadgen.",
    scope: "platform",
    logoSlug: "meta",
    logoColor: "0866FF",
    brandColor: "#0866FF",
    docsUrl: "https://developers.facebook.com/apps",
    capabilities: { test: true },
    fields: [
      { key: "app_id", label: "App ID", type: "text", required: true },
      {
        key: "app_secret",
        label: "App secret",
        type: "password",
        secret: true,
        required: true,
        help: "Also verifies Meta's data deletion and deauthorize callbacks. Reset it in Meta if it was ever shared.",
      },
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
        default: "v27.0",
      },
    ],
  },
  {
    id: "capi",
    type: "meta_ads",
    name: "Meta Conversions API (Codevertex dataset)",
    description:
      "Server events to Codevertex's own Meta dataset (Events Manager > Datasets). Tenants send their own conversions with their own dataset from their settings. Test sends one event with the test event code, shown only on the dataset's Test events tab.",
    scope: "platform",
    logoSlug: "meta",
    logoColor: "0866FF",
    brandColor: "#0866FF",
    docsUrl: "https://business.facebook.com/events_manager2",
    capabilities: { test: true },
    fields: [
      { key: "dataset_id", label: "Dataset (pixel) ID", type: "text", required: true },
      {
        key: "access_token",
        label: "Conversions API access token",
        type: "password",
        secret: true,
        required: true,
        help: "Events Manager > dataset > Settings > Conversions API > Generate access token (a system user token, not a Graph Explorer token).",
      },
      {
        key: "test_event_code",
        label: "Test event code",
        type: "text",
        help: "From the dataset's Test events tab (for example TEST12345). Leave empty in production.",
      },
      { key: "graph_version", label: "Graph API version", type: "text", default: "v27.0" },
    ],
  },
  {
    id: "threads",
    type: "meta_ads",
    name: "Threads",
    description:
      "The Threads use case of the same Meta app (its own app ID and secret), for publishing to a business's Threads profile (Sprint 16). In the Threads settings set the redirect callback https://marketflowapi.codevertexafrica.com/api/v1/integrations/threads/callback, and the uninstall and delete callbacks to the Meta deauthorize and data deletion URLs above.",
    scope: "platform",
    logoSlug: "threads",
    logoColor: "000000",
    brandColor: "#000000",
    docsUrl: "https://developers.facebook.com/docs/threads",
    capabilities: { test: true },
    fields: [
      { key: "app_id", label: "Threads app ID", type: "text", required: true },
      { key: "app_secret", label: "Threads app secret", type: "password", secret: true, required: true },
      {
        key: "redirect_url",
        label: "OAuth redirect URL",
        type: "url",
        default: "https://marketflowapi.codevertexafrica.com/api/v1/integrations/threads/callback",
      },
      {
        key: "scopes",
        label: "Permissions requested at connect",
        type: "text",
        default: "threads_basic,threads_content_publish",
        help: "Comma-separated; only permissions Meta has approved for the app.",
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
    // No developer token: Google retired them on 2026-09-09. API access belongs to the Cloud
    // project that owns this OAuth client; its level is set on that project's Google Ads API page.
    description: "Google Ads OAuth client. API access level comes from its Google Cloud project.",
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

// ── Social publishing (platform OAuth client; channels are per-tenant) ────
// Saved as ProviderSetting youtube/oauth; marketflow-api reads it in
// internal/integrations/google. Each business then connects its own channel under
// /settings/integrations, and the refresh token is kept on that channel's row.

const publishingProviders: ProviderDef[] = [
  {
    id: "switches",
    type: "publishing",
    name: "Posting switches",
    description:
      "Turns organic posting on per platform for every business. Keep a platform off until its app review has passed; a business can only post where the switch is on and its own account is connected.",
    scope: "platform",
    brandColor: "#334155",
    fields: [
      onOff("facebook_enabled", "Facebook Pages"),
      onOff("instagram_enabled", "Instagram"),
      onOff("tiktok_enabled", "TikTok"),
      onOff("youtube_enabled", "YouTube"),
      onOff("x_enabled", "X"),
    ],
  },
  {
    id: "oauth",
    type: "youtube",
    name: "YouTube",
    description:
      "Google OAuth client for posting Shorts to each business's own YouTube channel. It asks for youtube.upload and youtube.force-ssl only. In Google Cloud Console add the redirect URL below to the web client and enable the YouTube Data API v3.",
    scope: "platform",
    logoSlug: "youtube",
    logoColor: "FF0000",
    brandColor: "#FF0000",
    docsUrl: "https://console.cloud.google.com/apis/credentials",
    capabilities: { test: true },
    fields: [
      { key: "client_id", label: "Client ID", type: "text", required: true, help: "OAuth 2.0 Client ID (…apps.googleusercontent.com)" },
      { key: "client_secret", label: "Client secret", type: "password", secret: true, required: true },
      {
        key: "redirect_url",
        label: "OAuth redirect URL",
        type: "url",
        required: true,
        default: "https://marketflowapi.codevertexafrica.com/api/v1/integrations/youtube/callback",
      },
    ],
  },
  {
    id: "oauth",
    type: "tiktok",
    name: "TikTok",
    description:
      "TikTok for Developers app (Login Kit and Content Posting API) for posting to each business's own TikTok account. It asks for user.info.basic, video.publish and video.upload only. Add the redirect URL below as a Web redirect URI under Login Kit, and the webhook URL under Webhooks.",
    scope: "platform",
    logoSlug: "tiktok",
    logoColor: "000000",
    brandColor: "#000000",
    docsUrl: "https://developers.tiktok.com/apps",
    fields: [
      { key: "client_key", label: "Client key", type: "text", required: true, help: "From the app's Credentials section. TikTok calls the app id a client key." },
      { key: "client_secret", label: "Client secret", type: "password", secret: true, required: true, help: "Also signs TikTok's webhooks to https://marketflowapi.codevertexafrica.com/api/v1/webhooks/tiktok/events" },
      {
        key: "redirect_url",
        label: "OAuth redirect URL",
        type: "url",
        required: true,
        default: "https://marketflowapi.codevertexafrica.com/api/v1/integrations/tiktok-creator/callback",
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
  /** No authorize route in marketflow-api yet: shown as coming soon instead of a Connect that 404s. */
  comingSoon?: boolean;
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
    description: "See your Google Ads results in MarketFlow and send your leads back as conversions.",
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
    id: "youtube",
    name: "YouTube",
    description: "Post approved videos as Shorts to your own YouTube channel.",
    logoSlug: "youtube",
    logoColor: "FF0000",
    brandColor: "#FF0000",
    requiresPlatformConfig: "youtube",
    authorizePath: "/api/v1/integrations/youtube/authorize",
  },
  {
    id: "tiktok",
    name: "TikTok",
    description: "Post approved videos to your own TikTok account.",
    logoSlug: "tiktok",
    logoColor: "000000",
    brandColor: "#000000",
    requiresPlatformConfig: "tiktok",
    authorizePath: "/api/v1/integrations/tiktok-creator/authorize",
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
    comingSoon: true, // no LinkedIn integration in marketflow-api yet
  },
];

// ── Media generation (Creative Studio, platform-wide) ─────────────────────
// Saved as ProviderSetting media/<id>, key api_key; marketflow-ai reads them
// (internal/app/media.go). Routes and prices: marketflow docs,
// integrations/video-generation-providers.md (confirmed 2026-10-24).

const mediaProviders: ProviderDef[] = [
  {
    id: "routing",
    type: "media",
    name: "Media routing and cost ceiling",
    description:
      "Which route each scenario tries first, premium routes for the platform owner, and the most one video or poster may cost at provider prices. marketflow-ai reads it within a minute.",
    scope: "platform",
    brandColor: "#0F766E",
    fields: [
      {
        key: "max_video_budget_usd",
        label: "Cost ceiling per video (USD)",
        type: "number",
        default: "2",
        min: 0.1,
        max: 50,
        help: "No video ad or poster is made above this provider cost, premium included. Quotes show it next to the plan.",
      },
      onOff("premium_for_exempt", "Premium routes for the platform owner", "true"),
      {
        key: "premium_budget_usd",
        label: "Premium budget per video (USD)",
        type: "number",
        default: "2",
        min: 0,
        max: 50,
        help: "Above this all-premium quote the dearest scenes fall back to standard. It never goes above the ceiling.",
      },
      {
        key: "prefer",
        label: "Preferred routes (JSON)",
        type: "textarea",
        placeholder: '{"ad_clip/standard": ["fal/hailuo-2.3-fast"], "still/premium": ["fal/seedream-v5-lite"]}',
        help: "scenario/tier to route keys, tried in order. Scenarios: presenter, ad_clip, motion, still, poster. Leave empty for the bake-off defaults.",
      },
    ],
  },
  {
    id: "review",
    type: "media",
    name: "Self-review before the owner sees it",
    description:
      "A cheap vision model checks storyboard stills, posters and finished video frames for logo placement, legibility, garbled text, the wrong brand and off-location scenes, and redoes the failing part within budget.",
    scope: "platform",
    brandColor: "#7C3AED",
    fields: [
      onOff("enabled", "Review on", "true"),
      { key: "max_retries", label: "Retries per part", type: "number", default: "1", min: 0, max: 3, help: "0 reviews and reports only." },
      { key: "poster_retry_usd", label: "Poster retry budget (USD)", type: "number", default: "0.10", min: 0, max: 2 },
      { key: "still_retry_usd", label: "Storyboard retry budget (USD)", type: "number", default: "0.10", min: 0, max: 2 },
      { key: "video_frames", label: "Frames checked per video", type: "number", default: "8", min: 1, max: 12 },
      {
        key: "targets",
        label: "Vision models (JSON)",
        type: "textarea",
        placeholder: '[{"provider":"groq","model":"meta-llama/llama-4-scout-17b-16e-instruct"},{"provider":"anthropic","model":"claude-haiku-4-5"}]',
        help: "Tried in order; each provider uses the key saved on its AI card. Empty uses the two shown.",
      },
      { key: "prompt", label: "Reviewer instructions", type: "textarea", help: "Empty uses the built-in checklist." },
    ],
  },
  {
    id: "fal",
    type: "media",
    name: "fal.ai",
    description:
      "Pay as you go. Poster images (Seedream, Nano Banana), talking presenters (VEED Fabric, Creatify Aurora), the voice fallback and video assembly.",
    scope: "platform",
    brandColor: "#5B21B6",
    docsUrl: "https://fal.ai/dashboard/keys",
    capabilities: { test: true, syncModels: true, balance: true },
    fields: [
      {
        key: "api_key",
        label: "API key",
        type: "password",
        secret: true,
        required: true,
        help: "Format key-id:key-secret. Keep a balance: generation fails at USD 0, and the router skips fal.ai when it is low.",
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
    capabilities: { test: true, balance: true },
    fields: [
      {
        key: "api_key",
        label: "API key",
        type: "password",
        secret: true,
        required: true,
        help: "Format key-id:key-secret. Keep a balance: generation fails at USD 0.",
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
    capabilities: { test: true, syncModels: true, balance: true },
    modelFieldKeys: ["voice_model", "voice_premium_model"],
    fields: [
      {
        key: "api_key",
        label: "API key",
        type: "password",
        secret: true,
        required: true,
        help: "Needs a paid plan: free-plan audio can never be used in ads, even after upgrading.",
      },
      { key: "voice_model", label: "Voice model (standard)", type: "text", placeholder: "eleven_v4_turbo" },
      { key: "voice_premium_model", label: "Voice model (premium)", type: "text", placeholder: "eleven_v4" },
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
    capabilities: { test: true },
    fields: [{ key: "api_key", label: "API key", type: "password", secret: true }],
  },
];

// Market research (Find, Flip, Fix): read by marketflow-ai as adintel/serpapi and adintel/serper.
const researchProviders: ProviderDef[] = [
  {
    id: "serpapi",
    type: "adintel",
    name: "SerpApi (competitor ads)",
    description: "Google Ads Transparency Center search for the weekly competitor scan. Free plan: 250 searches a month.",
    scope: "platform",
    brandColor: "#1A73E8",
    docsUrl: "https://serpapi.com/google-ads-transparency-center",
    fields: [
      { key: "api_key", label: "API key", type: "password", secret: true, required: true, help: "From serpapi.com, Account, API key. Not the Serper key." },
      {
        key: "paid_enabled",
        label: "Allow paid searches",
        type: "select",
        default: "false",
        options: [
          { value: "false", label: "No, free plan only" },
          { value: "true", label: "Yes, up to the paid cap" },
        ],
        help: "No keeps the scan inside the free 250 searches a month.",
      },
      { key: "paid_monthly_cap", label: "Paid monthly cap", type: "number", default: "250", min: 1, help: "Searches a month when paid searches are on." },
      { key: "tenant_share", label: "Searches per business a month", type: "number", default: "5", min: 1 },
      {
        key: "details_platform_monthly",
        label: "Ad detail reads a month (all businesses)",
        type: "number",
        default: "50",
        min: 0,
        help: "Reads of a winning ad's words, used only to tag it. They also count in the searches above, so the scan keeps the rest. 0 turns tags off.",
      },
      { key: "details_per_tenant", label: "Ad detail reads per business a month", type: "number", default: "3", min: 0 },
      { key: "details_k", label: "Winners tagged per scan", type: "number", default: "3", min: 0, help: "The best-scored winners of each weekly scan that get tags." },
      {
        key: "summary_model_class",
        label: "Winners summary model",
        type: "select",
        default: "nano",
        options: [
          { value: "nano", label: "Nano (free models first)" },
          { value: "standard", label: "Standard" },
        ],
        help: "Writes the short brief the Ads Specialist reads from the tagged winners.",
      },
    ],
  },
  {
    id: "serper",
    type: "adintel",
    name: "Serper (customer complaints)",
    description: "Google Places and reviews, for the complaint themes owners search on their Brand context page.",
    scope: "platform",
    brandColor: "#111827",
    docsUrl: "https://serper.dev",
    fields: [
      { key: "api_key", label: "API key", type: "password", secret: true, required: true, help: "From serper.dev. Without it the server's MF_SERPER_API_KEY is used, if set." },
      { key: "monthly_cap", label: "Monthly searches", type: "number", default: "300", min: 1, help: "One complaint report uses up to 4 searches." },
      { key: "tenant_share", label: "Searches per business a month", type: "number", default: "12", min: 4 },
    ],
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
    id: "research",
    label: "Market research",
    description: "Competitor ads and customer complaints for Find, Flip, Fix. Free tiers first.",
    providers: researchProviders,
  },
  {
    id: "scheduling",
    label: "Scheduling",
    description: "Google Calendar integration defaults.",
    providers: schedulingProviders,
  },
  {
    id: "publishing",
    label: "Social publishing",
    description: "OAuth clients for posting to each business's own channels.",
    providers: publishingProviders,
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

/** An on and off setting saved as "true" or "false". */
function onOff(key: string, label: string, def = "false"): ProviderField {
  return {
    key,
    label,
    type: "select",
    default: def,
    options: [
      { value: "true", label: "On" },
      { value: "false", label: "Off" },
    ],
  };
}
