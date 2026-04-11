"use client";

import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send, Bot, User, Loader2 } from "lucide-react";
import { AI_API_URL } from "@/lib/api/client";
import { useAuthStore } from "@/store/auth-store";

interface Message {
  role: "user" | "assistant";
  content: string;
  intent?: string;
  model?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentMeta, setCurrentMeta] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { session } = useAuthStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isStreaming) return;

    const question = input.trim();
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setIsStreaming(true);
    setCurrentMeta(null);

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
      });

      if (!response.ok) throw new Error(`Chat failed: ${response.status}`);

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let assistantContent = "";

      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);

          if (data === "[DONE]") break;

          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "meta") {
              setCurrentMeta(parsed.data);
            } else if (parsed.type === "delta" && parsed.content) {
              assistantContent += parsed.content;
              setMessages((prev) => {
                const updated = [...prev];
                updated[updated.length - 1] = {
                  role: "assistant",
                  content: assistantContent,
                  intent: currentMeta?.intent,
                  model: currentMeta?.model,
                };
                return updated;
              });
            }
          } catch {}
        }
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev.slice(0, -1),
        { role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setIsStreaming(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-bold">AI Chat</h1>
        <p className="text-muted-foreground">Ask about products, business opportunities, or create marketing content</p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <Bot className="h-12 w-12 mb-4 opacity-50" />
              <p className="text-lg font-medium">Start a conversation</p>
              <p className="text-sm">Ask about Forever products or say &quot;Create a Meta ad for C9&quot;</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
              {msg.role === "assistant" && (
                <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
                     style={{ backgroundColor: "var(--brand-primary)" }}>
                  <Bot className="h-4 w-4 text-black" />
                </div>
              )}
              <div className={`max-w-[70%] rounded-lg p-3 ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted"
              }`}>
                <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                {msg.intent && (
                  <div className="mt-2 flex gap-1">
                    <Badge variant="outline" className="text-xs">{msg.intent}</Badge>
                    {msg.model && <Badge variant="outline" className="text-xs">{msg.model}</Badge>}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary-foreground" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="border-t p-4">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
              placeholder="Ask about products, business, or say 'Create a Meta ad for Aloe Vera Gel'..."
              className="min-h-[44px] max-h-32 resize-none"
              disabled={isStreaming}
            />
            <Button onClick={sendMessage} disabled={isStreaming || !input.trim()} size="icon"
                    style={{ backgroundColor: "var(--brand-primary)" }}>
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
