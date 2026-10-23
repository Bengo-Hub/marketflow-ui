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

export interface BrandContext {
  positioning: string;
  audience: string[];
  offers: string[];
  proof: string[];
  voice: string;
  voice_examples: string[];
  banned_claims: string[];
  learnings: string[];
}

export interface OSSettings {
  daily_brief: boolean;
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
export function apiError(e: unknown, fallback: string): string {
  const err = e as { response?: { data?: { error?: string; message?: string } } };
  return err?.response?.data?.error || err?.response?.data?.message || fallback;
}

export const marketingOsApi = {
  team: () =>
    aiClient.get<{ members: TeamMember[]; playbooks: Playbook[] }>("/api/v1/os/team").then((r) => r.data),
  optimize: (text: string) => aiClient.post<TaskSpec>("/api/v1/os/optimize", { text }).then((r) => r.data),
  ask: (body: AskBody) => aiClient.post<AskResponse>("/api/v1/os/ask", body).then((r) => r.data),
  askStream,
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
  settings: () => apiClient.get<OSSettings>("/api/v1/tenant/os-settings").then((r) => r.data),
  saveSettings: (s: OSSettings) => apiClient.put<OSSettings>("/api/v1/tenant/os-settings", s).then((r) => r.data),
};
