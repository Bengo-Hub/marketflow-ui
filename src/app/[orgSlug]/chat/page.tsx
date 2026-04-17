"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Send,
  Bot,
  User,
  Loader2,
  Sparkles,
  StopCircle,
  Copy,
  Check,
} from "lucide-react";
import { AI_API_URL } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: string;
  model?: string;
  sources?: number;
  cached?: boolean;
  streaming?: boolean;
}

let msgIdCounter = 0;
function genId() {
  return `msg-${++msgIdCounter}-${Date.now()}`;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const { session } = useAuthStore();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(scrollToBottom, [messages, scrollToBottom]);

  const stopStreaming = () => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setThinkingPhase(null);
  };

  const sendMessageDirect = useCallback((text: string) => {
    if (!text.trim() || isStreaming) return;
    doSend(text.trim());
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isStreaming]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;
    doSend(input.trim());
  };

  const doSend = async (question: string) => {
    setInput("");

    const userMsg: Message = { id: genId(), role: "user", content: question };
    const assistantId = genId();
    setMessages((prev) => [
      ...prev,
      userMsg,
      { id: assistantId, role: "assistant", content: "", streaming: true },
    ]);
    setIsStreaming(true);
    setThinkingPhase("Thinking...");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const tenantId = localStorage.getItem("mf_tenant_id");
      const response = await fetch(`${AI_API_URL}/api/v1/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.accessToken}`,
          ...(tenantId ? { "X-Tenant-ID": tenantId } : {}),
        },
        body: JSON.stringify({ question, stream: true }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";
      let metaData: Record<string, any> = {};
      let buffer = "";

      setThinkingPhase("Processing...");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "meta") {
              metaData = parsed.data ?? {};
              const intentLabel =
                metaData.intent === "task_execute"
                  ? "Generating content..."
                  : metaData.intent === "product_qa"
                  ? "Searching knowledge base..."
                  : metaData.intent === "business_opportunity"
                  ? "Looking up business info..."
                  : "Composing response...";
              setThinkingPhase(intentLabel);
            } else if (parsed.type === "delta" && parsed.content) {
              assistantContent += parsed.content;
              setThinkingPhase(null);
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId
                    ? {
                        ...m,
                        content: assistantContent,
                        intent: metaData.intent,
                        model: metaData.model,
                        sources: metaData.sources,
                        cached: metaData.cached,
                        streaming: true,
                      }
                    : m,
                ),
              );
            }
          } catch {
            // skip unparseable chunks
          }
        }
      }

      // Mark as done.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m,
        ),
      );
    } catch (err: any) {
      if (err?.name === "AbortError") {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, content: m.content || "Stopped.", streaming: false }
              : m,
          ),
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? {
                  ...m,
                  content: "Sorry, something went wrong. Please try again.",
                  streaming: false,
                }
              : m,
          ),
        );
      }
    } finally {
      setIsStreaming(false);
      setThinkingPhase(null);
      abortRef.current = null;
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)]">
      <div className="mb-3">
        <h1 className="text-2xl font-bold tracking-tight">AI Chat</h1>
        <p className="text-sm text-muted-foreground">
          Ask about products, business opportunities, or create marketing content
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-0 shadow-md">
        {/* Messages area */}
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-1">
          {messages.length === 0 && (
            <EmptyState onSelect={(q) => { setInput(q); setTimeout(() => { setInput(q); sendMessageDirect(q); }, 50); }} />
          )}

          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} />
          ))}

          {thinkingPhase && <ThinkingIndicator label={thinkingPhase} />}

          <div ref={messagesEndRef} />
        </CardContent>

        {/* Input bar */}
        <div className="border-t bg-background p-3">
          <div className="flex items-center gap-2 max-w-3xl mx-auto">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Ask about products, business, or say 'Create a Meta ad for Aloe Vera Gel'..."
              disabled={isStreaming}
              className="text-sm"
            />
            {isStreaming ? (
              <Button
                onClick={stopStreaming}
                size="icon"
                variant="outline"
                className="shrink-0"
              >
                <StopCircle className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={sendMessage}
                disabled={!input.trim()}
                size="icon"
                className="shrink-0"
                style={{ backgroundColor: "var(--brand-primary)" }}
              >
                <Send className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

function EmptyState({ onSelect }: { onSelect: (q: string) => void }) {
  const suggestions = [
    "What is Forever Aloe Vera Gel?",
    "Tell me about the C9 program",
    "How does the business opportunity work?",
    "Create a Google ad for Argi+",
    "Set up a Meta lead ads campaign for C9",
    "Generate my product shop link",
  ];

  return (
    <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
      <div className="rounded-full bg-amber-50 p-4">
        <Sparkles className="h-8 w-8 text-amber-500" />
      </div>
      <div className="text-center">
        <p className="text-base font-medium text-foreground">
          Start a conversation
        </p>
        <p className="text-sm mt-1">
          Ask about Forever products, the business opportunity, or say
          &quot;Create a Meta ad for C9&quot;
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2 mt-2">
        {suggestions.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="rounded-full border px-3 py-1.5 text-xs hover:bg-muted hover:border-amber-400 transition cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}

function ThinkingIndicator({ label }: { label: string }) {
  return (
    <div className="flex gap-3 items-start">
      <div
        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0"
        style={{ backgroundColor: "var(--brand-primary)" }}
      >
        <Bot className="h-3.5 w-3.5 text-black" />
      </div>
      <div className="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2.5">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.role === "user") {
    return (
      <div className="flex justify-end gap-2 py-1">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground">
          {message.content}
        </div>
        <div className="h-7 w-7 rounded-full bg-primary flex items-center justify-center shrink-0 mt-0.5">
          <User className="h-3.5 w-3.5 text-primary-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2 py-1 group">
      <div
        className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
        style={{ backgroundColor: "var(--brand-primary)" }}
      >
        <Bot className="h-3.5 w-3.5 text-black" />
      </div>
      <div className="flex-1 min-w-0 max-w-[85%]">
        <div className="rounded-2xl rounded-bl-sm bg-muted px-4 py-3">
          {message.content ? (
            <div className="prose prose-sm dark:prose-invert max-w-none text-sm leading-relaxed [&_p]:mb-2 [&_ul]:mb-2 [&_ol]:mb-2 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_pre]:bg-background [&_pre]:rounded-lg [&_pre]:p-3 [&_code]:text-xs [&_blockquote]:border-l-2 [&_blockquote]:pl-3 [&_blockquote]:italic [&_a]:text-blue-600 [&_a]:underline">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {message.content}
              </ReactMarkdown>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex gap-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:0ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:150ms]" />
                <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground animate-bounce [animation-delay:300ms]" />
              </span>
            </div>
          )}
          {message.streaming && message.content && (
            <span className="inline-block h-3 w-0.5 bg-foreground animate-pulse ml-0.5" />
          )}
        </div>

        {/* Footer: badges + copy */}
        {!message.streaming && message.content && (
          <div className="mt-1 flex items-center gap-1.5 px-1">
            {message.intent && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4"
              >
                {message.intent}
              </Badge>
            )}
            {message.model && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4"
              >
                {message.model}
              </Badge>
            )}
            {message.cached && (
              <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-800 hover:bg-green-100">
                cached
              </Badge>
            )}
            {(message.sources ?? 0) > 0 && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 h-4"
              >
                {message.sources} sources
              </Badge>
            )}
            <button
              onClick={copyToClipboard}
              className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground"
              title="Copy response"
            >
              {copied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
