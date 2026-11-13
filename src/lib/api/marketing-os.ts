import { AI_API_URL, aiClient, apiClient, tenantHeaders } from "./client";

// Marketing OS: the team runtime lives in marketflow-ai (/api/v1/os/*); brand
// context, team overrides and switches are owned by marketflow-api.

export type ModelClass = "nano" | "standard" | "premium" | "premium_plus";

export interface TeamMember {
  key: string;
  name: string;
  role: string;
  reports_to?: string;
  description: string;
  model_class: ModelClass;
  playbooks: string[];
  tools?: string[];
  guardrails?: string[];
  enabled: boolean;
}

export interface Playbook {
  key: string;
  name: string;
  specialist: string;
  when_to_use: string;
  output_contract: string;
}

export interface MemberOverride {
  key: string;
  name?: string;
  disabled?: boolean;
  model_class?: ModelClass | "";
  instructions?: string;
}

/** One generated field: text for a text field, items for a list field. */
export interface FieldSuggestion {
  field: string;
  text?: string;
  items?: string[];
}

export interface BrandContext {
  positioning: string;
  audience: string[];
  offers: string[];
  proof: string[];
  voice: string;
  voice_examples: string[];
  banned_claims: string[];
  learnings: string[];
  /** Naming tradition for people in videos; empty leaves it to the writer. */
  actor_name_style?: ActorNameStyle | "";
  /** Exact names the business likes for people in videos; the writer uses only these when set. */
  actor_names?: string[];
}

/** Server list (marketflow-api marketingos.ActorNameStyles). */
export type ActorNameStyle = "kikuyu" | "luo" | "kalenjin" | "kamba" | "maasai" | "swahili_coast" | "neutral" | "mixed";

export const ACTOR_NAME_STYLES: Record<ActorNameStyle, string> = {
  kikuyu: "Kikuyu names",
  luo: "Luo names",
  kalenjin: "Kalenjin names",
  kamba: "Kamba names",
  maasai: "Maasai names",
  swahili_coast: "Swahili coast names",
  neutral: "Neutral names",
  mixed: "A mix of Kenyan names",
};

/** Server limits for actor names (marketingos/actor_names.go). */
export const MAX_ACTOR_NAMES = 20;
export const MAX_ACTOR_NAME_LEN = 40;

export interface OSSettings {
  daily_brief: boolean;
  /** Social inbox auto reply (Sprint 22): answers buyer comments and DMs with inbox_reply_text. */
  inbox_auto_reply?: boolean;
  inbox_reply_text?: string;
  /** Competitor names, domains or Google advertiser ids for the weekly ad scan (Sprint 24). */
  competitors?: string[];
  /** Ads the owner saw working, with notes on why (Find, Flip, Fix). At most 20. */
  reference_ads?: ReferenceAd[];
  /** What customers in this market complain about; ads answer them only with true facts. At most 20. */
  customer_complaints?: string[];
}

export interface ComplaintTheme {
  key: string;
  description: string;
  count: number;
  example?: string;
}

export interface ComplaintReport {
  query: string;
  businesses: number;
  low_reviews: number;
  themes: ComplaintTheme[] | null;
  /** Similar businesses the search found, offered as competitors. */
  places?: { name: string; website?: string; rating?: number; reviews?: number }[];
  cached?: boolean;
}

export interface ResearchWinner {
  advertiser: string;
  format: string;
  total_days_shown: number;
  still_running: boolean;
  link?: string;
}

export interface ResearchCompetitor {
  query: string;
  read_at?: string;
  winners: ResearchWinner[];
}

/** The complaint search run once at onboarding (1 credit). Suggestions only, until the owner adds them. */
export interface MarketSuggestions {
  query: string;
  status: "ready" | "no_credits";
  at: string;
  themes?: ComplaintTheme[] | null;
  places?: ComplaintReport["places"];
}

export interface MarketResearch {
  competitors: ResearchCompetitor[];
  suggestions: MarketSuggestions | null;
}

export type ReferencePlatform = "meta" | "tiktok" | "youtube" | "google" | "other";

export interface ReferenceAd {
  url: string;
  platform: ReferencePlatform;
  notes: string;
}

export interface TaskSpec {
  playbook: string;
  specialist: string;
  complexity: "single" | "few" | "campaign";
  entities: {
    offering?: string;
    audience?: string;
    objective?: string;
    goal?: string;
    topic?: string;
    competitors?: string[];
    platforms?: string[];
    budget_kes?: number;
    period_days?: number;
    url?: string;
    language?: string;
  };
  missing_fields?: string[];
  clarifying_question?: string;
  optimised_brief: string;
  confidence: number;
  injection_suspected?: boolean;
}

export interface PlanLine {
  key: string;
  name: string;
  qty: number;
  credits: number;
}

export interface PlanOption {
  label: string;
  variants: number;
  shortlist: number;
  tier?: string;
  lines: PlanLine[];
  credits: number;
  affordable: boolean;
  description: string;
}

export interface CreativePlan {
  recommended: PlanOption;
  alternatives: PlanOption[];
  max_live_ads: number;
  max_renders: number;
  daily_per_ad_kes?: number;
  ad_budget_kes: number;
  days: number;
  credits_available: number;
  shortfall: number;
  suggested_bundle?: { code: string; units: number; price_kes: number };
  notes?: string[];
}

export interface TeamStep {
  member: string;
  playbook: string;
  task: string;
  contract: string;
  output?: unknown;
  text?: string;
  error?: string;
}

export interface Finding {
  quote: string;
  issue: string;
  severity: "high" | "review" | "low";
  fix: string;
}

export interface NextAction {
  key: string;
  label: string;
  available: boolean;
  sprint?: string;
}

export interface TeamResult {
  route: "clarify" | "chat" | "quote" | "done" | "blocked";
  spec?: TaskSpec;
  question?: string;
  plan?: CreativePlan;
  steps?: TeamStep[];
  shortlist?: string[];
  findings?: Finding[];
  next_actions?: NextAction[];
  cost_usd: number;
}

export interface AskResponse {
  run_id: string;
  result: TeamResult;
  answer?: string;
  credits_charged: number;
}

/** What make-media made in Studio from an approved turn (marketflow-ai /os/make-media). */
export interface MadeMedia {
  run_id: string;
  brief_id: string;
  version_id: string;
  seconds: number;
  kind: string;
  step: number;
  /** The brief's Studio page after the org slug, e.g. "/studio/<brief id>". */
  studio_path: string;
}

/** Console actions that make media from an approved turn once marketflow-ai marks them available. */
export const MEDIA_ACTIONS = new Set(["produce_media", "storyboard", "render"]);

export interface Template {
  id: string;
  title: string;
  template: string;
  playbook?: string;
  category: string;
  source: string;
}

/** One stage of a running request, streamed by /os/ask. */
export interface TeamProgress {
  stage: string;
  member?: string;
  label: string;
}

type AskBody = { text: string; approve_plan?: boolean; tier?: string; platforms?: string[]; playbook?: string };

/** An error shaped like axios's, so apiError() reads it the same way. */
function streamError(status: number, error: string) {
  return Object.assign(new Error(error), { response: { status, data: { error } } });
}

/**
 * Ask the team with live progress. It streams /os/ask and calls onProgress for
 * each stage. If the stream cannot start (an older server, a proxy, an expired
 * token) it falls back to the plain request, so progress is a bonus and never a
 * reason for the request to fail. Nothing was charged when it falls back: the
 * server charges only once the stream has opened.
 */
async function askStream(body: AskBody, onProgress: (p: TeamProgress) => void): Promise<AskResponse> {
  const auth = aiClient.defaults.headers.common.Authorization;
  if (typeof window === "undefined" || typeof auth !== "string") {
    return marketingOsApi.ask(body);
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 120_000);
  try {
    let resp: Response;
    try {
      resp = await fetch(`${AI_API_URL}/api/v1/os/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream", Authorization: auth, ...tenantHeaders() },
        body: JSON.stringify({ ...body, stream: true }),
        signal: controller.signal,
      });
    } catch {
      return marketingOsApi.ask(body); // network or CORS: the plain request still works
    }
    if (resp.status === 401) return marketingOsApi.ask(body); // axios refreshes the token
    if (!resp.ok) {
      const data = await resp.json().catch(() => ({}));
      throw streamError(resp.status, (data as { error?: string }).error || `Request failed (${resp.status})`);
    }
    if (!resp.headers.get("content-type")?.includes("text/event-stream") || !resp.body) {
      return (await resp.json()) as AskResponse; // a server that answered with plain JSON
    }

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = buffer.split("\n\n");
      buffer = events.pop() ?? "";
      for (const ev of events) {
        const line = ev.split("\n").find((l) => l.startsWith("data: "));
        if (!line) continue;
        const data = line.slice(6);
        if (data === "[DONE]") continue;
        const msg = JSON.parse(data) as
          | { type: "progress"; data: TeamProgress }
          | { type: "result"; data: AskResponse }
          | { type: "error"; status: number; error: string };
        if (msg.type === "progress") onProgress(msg.data);
        else if (msg.type === "result") return msg.data;
        else if (msg.type === "error") throw streamError(msg.status, msg.error);
      }
    }
    // The stream ended without a result. The request may have been charged, so
    // it is not retried automatically.
    throw streamError(0, "The connection dropped before the team finished. Check your credits, then try again.");
  } catch (e) {
    if ((e as Error)?.name === "AbortError") {
      throw Object.assign(new Error("timeout"), { code: "ECONNABORTED" });
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** The server's own message (both services answer {error: "..."}), else a fallback. */
export { apiErrorMessage as apiError } from "./errors";

export const marketingOsApi = {
  team: () =>
    aiClient.get<{ members: TeamMember[]; playbooks: Playbook[] }>("/api/v1/os/team").then((r) => r.data),
  optimize: (text: string) => aiClient.post<TaskSpec>("/api/v1/os/optimize", { text }).then((r) => r.data),
  /** "Generate with AI" for one profile or brand-context field (marketflow-ai team.FieldSpecs). */
  suggestField: (field: string, form: Record<string, string>, language?: "en" | "sw") =>
    aiClient.post<FieldSuggestion>("/api/v1/os/field-suggest", { field, form, language }).then((r) => r.data),
  ask: (body: AskBody) => aiClient.post<AskResponse>("/api/v1/os/ask", body).then((r) => r.data),
  askStream,
  /**
   * Make an approved turn's video script into a Studio video ad and start its storyboard. Studio's
   * refusals (brand images missing, too many drafts) come back with Studio's status and code.
   */
  makeMedia: (runId: string, step?: number) =>
    aiClient
      .post<MadeMedia>("/api/v1/os/make-media", { run_id: runId, step }, { timeout: 60_000 })
      .then((r) => r.data),
  templates: (q = "", category = "") =>
    aiClient
      .get<{ templates: Template[] }>("/api/v1/os/library/templates", { params: { q, category, limit: 30 } })
      .then((r) => r.data.templates ?? []),

  overrides: () =>
    apiClient.get<{ members: MemberOverride[] }>("/api/v1/agents/team").then((r) => r.data.members ?? []),
  saveMember: (o: MemberOverride) =>
    apiClient.put<MemberOverride>(`/api/v1/agents/team/${encodeURIComponent(o.key)}`, o).then((r) => r.data),
  brandContext: () => apiClient.get<BrandContext>("/api/v1/tenant/marketing-context").then((r) => r.data),
  saveBrandContext: (bc: BrandContext) =>
    apiClient.put<BrandContext>("/api/v1/tenant/marketing-context", bc).then((r) => r.data),
  /** What the weekly competitor scan found, and the onboarding market search if it ran. */
  research: () =>
    apiClient.get<MarketResearch>("/api/v1/tenant/market-research").then((r) => ({ competitors: r.data.competitors ?? [], suggestions: r.data.suggestions ?? null })),
  /** Complaint themes from public reviews of similar businesses. A fresh search costs 1 credit. */
  findComplaints: (query: string) =>
    apiClient.post<ComplaintReport>("/api/v1/tenant/market-research/complaints", { query }, { timeout: 60_000 }).then((r) => r.data),
  settings: () => apiClient.get<OSSettings>("/api/v1/tenant/os-settings").then((r) => r.data),
  saveSettings: (s: Partial<OSSettings>) => apiClient.put<OSSettings>("/api/v1/tenant/os-settings", s).then((r) => r.data),
};
