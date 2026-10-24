"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Check, Copy, MessageSquare, RotateCcw, Send, Square } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { BrandMark } from "@/components/landing/brand-mark";
import { PageHeader, ToneBadge } from "@/components/ui-kit";
import { useTenantProfile } from "@/hooks/use-tenant-profile";
import { ChatError, INTENT_LABEL, MAX_QUESTION, phaseFor, streamChat, type ChatMeta } from "@/lib/api/chat";

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  meta?: ChatMeta;
  streaming?: boolean;
  error?: { text: string; credits?: boolean };
}

const FLP_PROMPTS = [
  "What is Forever Aloe Vera Gel good for?",
  "Explain the C9 programme in simple words",
  "Write a WhatsApp status for Argi+",
  "Draft a Facebook post inviting people to join my team",
];
const GENERIC_PROMPTS = [
  "Write a WhatsApp broadcast for this week's offer",
  "Draft three Facebook post ideas for my business",
  "How many new leads did I get this week?",
  "Write a follow-up message for a customer who went quiet",
];

function Answer({ m, onRetry }: { m: Message; onRetry: () => void }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [copied, setCopied] = useState(false);
  const copy = () => {
    void navigator.clipboard.writeText(m.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="flex gap-3">
      <BrandMark className="mt-0.5 h-8 w-8 rounded-lg" />
      <div className="min-w-0 max-w-[85%] flex-1">
        <div className="rounded-2xl rounded-tl-md border border-border bg-card px-4 py-3 text-sm shadow-soft">
          {m.error ? (
            <div className="space-y-2">
              <p className="text-destructive">{m.error.text}</p>
              {m.error.credits ? (
                <Link href={`/${orgSlug}/settings/billing`} className={buttonVariants({ size: "sm", variant: "outline" })}>Buy AI credits</Link>
              ) : (
                <Button size="sm" variant="outline" onClick={onRetry}><RotateCcw /> Try again</Button>
              )}
            </div>
          ) : m.content ? (
            <div className="prose prose-sm max-w-none leading-relaxed dark:prose-invert [&_a]:text-primary [&_p]:my-1.5 [&_pre]:rounded-lg [&_pre]:bg-muted">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
            </div>
          ) : (
            <p className="text-muted-foreground" aria-live="polite">{phaseFor(m.meta?.intent)}...</p>
          )}
        </div>
        {!m.streaming && m.content && !m.error && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 px-1">
            {m.meta?.intent && INTENT_LABEL[m.meta.intent] && <ToneBadge>{INTENT_LABEL[m.meta.intent]}</ToneBadge>}
            {(m.meta?.sources ?? 0) > 0 && <ToneBadge tone="info">From {m.meta!.sources} knowledge base {m.meta!.sources === 1 ? "entry" : "entries"}</ToneBadge>}
            <Button variant="ghost" size="icon-sm" className="ml-auto" aria-label="Copy answer" onClick={copy}>{copied ? <Check /> : <Copy />}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const profile = useTenantProfile();
  const businessType = profile.data?.business_type;
  const prompts = businessType === "flp" ? FLP_PROMPTS : GENERIC_PROMPTS;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const sessionRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const idRef = useRef(0);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);
  useEffect(() => () => abortRef.current?.abort(), []);

  const patch = (id: number, p: Partial<Message>) => setMessages((all) => all.map((m) => (m.id === id ? { ...m, ...p } : m)));

  const ask = async (raw: string) => {
    const question = raw.trim().slice(0, MAX_QUESTION);
    if (!question || busy) return;
    setInput("");
    // marketflow-ai creates a session under a new client id (e4daad5), so memory starts from the first turn.
    sessionRef.current ??= crypto.randomUUID();
    const aid = ++idRef.current;
    setMessages((all) => [...all, { id: ++idRef.current, role: "user", content: question }, { id: aid, role: "assistant", content: "", streaming: true }]);
    setBusy(true);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      await streamChat(
        orgSlug,
        { question, sessionId: sessionRef.current, businessType },
        {
          onMeta: (meta) => {
            if (meta.session_id) sessionRef.current = meta.session_id;
            patch(aid, { meta });
          },
          onText: (content) => patch(aid, { content }),
        },
        controller.signal,
      );
      patch(aid, { streaming: false });
    } catch (e) {
      if ((e as Error).name === "AbortError") {
        setMessages((all) => all.map((m) => (m.id === aid ? { ...m, streaming: false, content: m.content || "Stopped." } : m)));
      } else {
        const credits = e instanceof ChatError && e.status === 402;
        patch(aid, { streaming: false, error: { text: (e as Error).message || "The assistant could not answer. Try again.", credits } });
      }
    } finally {
      setBusy(false);
      abortRef.current = null;
    }
  };

  const retry = (aid: number) => {
    const idx = messages.findIndex((m) => m.id === aid);
    const q = messages[idx - 1]?.content;
    setMessages((all) => all.filter((m) => m.id !== aid && m.id !== messages[idx - 1]?.id));
    if (q) void ask(q);
  };

  const newChat = () => {
    abortRef.current?.abort();
    sessionRef.current = undefined;
    setMessages([]);
  };

  return (
    <div className="flex h-[calc(100dvh-12.5rem)] min-h-105 flex-col gap-4 md:h-[calc(100dvh-8.5rem)]">
      <PageHeader
        icon={<MessageSquare />}
        title="Chat"
        description="Ask about your products and leads, or have a post or message drafted for you."
        actions={messages.length > 0 && <Button variant="outline" onClick={newChat}><RotateCcw /> New chat</Button>}
      />

      <section className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-[1.25rem]">
        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
          {messages.length === 0 ? (
            <div className="mx-auto flex h-full max-w-xl flex-col justify-center gap-4">
              <div>
                <h2 className="font-display text-lg font-semibold">What do you need today?</h2>
                <p className="text-sm text-muted-foreground">Answers draw on your knowledge base. Pick one to start, or type your own.</p>
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                {prompts.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void ask(q)}
                    className="rounded-xl border border-border bg-background/70 px-4 py-3 text-left text-sm transition-colors hover:border-primary/40 hover:bg-accent active:scale-[0.99]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) =>
              m.role === "user" ? (
                <div key={m.id} className="flex justify-end">
                  <p className="max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-tr-md bg-primary px-4 py-2.5 text-sm text-primary-foreground">{m.content}</p>
                </div>
              ) : (
                <Answer key={m.id} m={m} onRetry={() => retry(m.id)} />
              ),
            )
          )}
          <div ref={endRef} />
        </div>

        <form
          className="border-t border-border bg-background/70 p-3"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <div className="mx-auto flex max-w-3xl items-end gap-2">
            <Textarea
              aria-label="Your message"
              rows={1}
              maxLength={MAX_QUESTION}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void ask(input);
                }
              }}
              placeholder="Type a question or ask for a post"
              className="max-h-40 min-h-11 resize-none text-base sm:text-sm"
            />
            {busy ? (
              <Button type="button" size="icon" variant="outline" className="size-11 shrink-0" aria-label="Stop" onClick={() => abortRef.current?.abort()}><Square /></Button>
            ) : (
              <Button type="submit" size="icon" className="size-11 shrink-0" aria-label="Send" disabled={!input.trim()}><Send /></Button>
            )}
          </div>
          {input.length > MAX_QUESTION - 100 && <p className="mx-auto mt-1 max-w-3xl text-right text-xs text-muted-foreground tabular">{input.length}/{MAX_QUESTION}</p>}
        </form>
      </section>
    </div>
  );
}
