import { AI_API_URL, aiClient, tenantHeaders } from "./client";

/** What marketflow-ai says about an answer before the text arrives (the "meta" event). */
export interface ChatMeta {
  intent?: string;
  confidence?: number;
  sources?: number;
  model?: string;
  cached?: boolean;
  /** The conversation id (in the stream since marketflow-ai e4daad5; the plain reply always has it). */
  session_id?: string;
}

export interface ChatTurn {
  question: string;
  sessionId?: string;
  businessType?: string;
}

export interface ChatHandlers {
  onMeta?: (meta: ChatMeta) => void;
  /** The answer so far. A compliance rewrite replaces it, so always render this whole value. */
  onText: (text: string) => void;
}

/** Thrown for a refused or failed turn; `status` 402 means the AI credits are used up. */
export class ChatError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "ChatError";
  }
}

/** marketflow-ai rejects longer questions (chat.go). */
export const MAX_QUESTION = 1000;

/** Human labels for marketflow-ai intents (internal/ai/router.go). */
export const INTENT_LABEL: Record<string, string> = {
  simple_faq: "Quick answer",
  product_qa: "Product question",
  business_opportunity: "Business opportunity",
  recruitment: "Recruitment",
  task_execute: "Task",
  service_inquiry: "Services",
  course_inquiry: "Courses",
  support_request: "Support",
  data_query: "Your data",
  integration_interest: "Integrations",
  escalate: "Handed to a person",
};

/** What the stream is doing while no text has arrived yet. */
export function phaseFor(intent?: string): string {
  if (intent === "task_execute") return "Writing it up";
  if (intent === "product_qa") return "Checking your knowledge base";
  if (intent === "data_query") return "Looking at your data";
  return "Writing an answer";
}

/**
 * The headers for a dashboard chat turn. X-Tenant-ID carries the page's slug:
 * marketflow-ai resolves it to the tenant, checks it against the token, and uses
 * the slug itself for tool lookups.
 */
function chatHeaders(orgSlug: string, auth: string): Record<string, string> {
  return { ...tenantHeaders(), "Content-Type": "application/json", Accept: "text/event-stream", Authorization: auth, "X-Tenant-ID": orgSlug };
}

/** The plain JSON request, used when the stream can't start (axios refreshes an expired token). */
async function chatPlain(orgSlug: string, turn: ChatTurn, h: ChatHandlers, signal: AbortSignal) {
  try {
    const { data } = await aiClient.post<{ session_id: string; result: ChatMeta & { response: string } }>(
      "/api/v1/chat",
      { question: turn.question, session_id: turn.sessionId, business_type: turn.businessType, stream: false },
      { headers: { "X-Tenant-ID": orgSlug }, signal },
    );
    h.onMeta?.({ ...data.result, session_id: data.session_id });
    h.onText(data.result.response ?? "");
  } catch (e) {
    const err = e as { name?: string; response?: { status?: number; data?: { message?: string; error?: string } } };
    if (err.name === "CanceledError") throw new DOMException("Aborted", "AbortError");
    const s = err.response?.status;
    throw new ChatError(err.response?.data?.message || err.response?.data?.error || "The assistant could not answer. Try again.", s);
  }
}

/** Sends one question and streams the answer into `h`. Resolves when the answer is complete. */
export async function streamChat(orgSlug: string, turn: ChatTurn, h: ChatHandlers, signal: AbortSignal): Promise<void> {
  const auth = aiClient.defaults.headers.common.Authorization;
  if (typeof auth !== "string") return chatPlain(orgSlug, turn, h, signal);

  const resp = await fetch(`${AI_API_URL}/api/v1/chat`, {
    method: "POST",
    headers: chatHeaders(orgSlug, auth),
    body: JSON.stringify({ question: turn.question, session_id: turn.sessionId, business_type: turn.businessType, stream: true }),
    signal,
  });
  if (resp.status === 401) return chatPlain(orgSlug, turn, h, signal);
  if (!resp.ok) {
    const body = (await resp.json().catch(() => ({}))) as { message?: string; error?: string };
    throw new ChatError(body.message || body.error || `The assistant could not answer (${resp.status}).`, resp.status);
  }
  if (!resp.body) throw new ChatError("The assistant sent an empty reply.");

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (data === "[DONE]") return;
      let ev: { type?: string; content?: string; data?: ChatMeta; error?: string };
      try {
        ev = JSON.parse(data);
      } catch {
        continue;
      }
      if (ev.error) throw new ChatError("The assistant could not answer. Try again.");
      if (ev.type === "meta" && ev.data) h.onMeta?.(ev.data);
      else if (ev.type === "delta" && ev.content) h.onText((text += ev.content));
      else if (ev.type === "replace" && ev.content !== undefined) h.onText((text = ev.content));
    }
  }
}
