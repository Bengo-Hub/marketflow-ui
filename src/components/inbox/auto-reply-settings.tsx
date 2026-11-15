"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { CapsuleTabs, Field, GlassPanel } from "@/components/ui-kit";
import { AIFieldButton } from "@/components/marketing-os/ai-field-button";
import { apiErrorMessage } from "@/lib/api/errors";
import { DEFAULT_COMMENT_PROMPT, MAX_AUTO_REPLY, MAX_COMMENT_PROMPT } from "@/lib/api/inbox";
import { marketingOsApi, type OSSettings } from "@/lib/api/marketing-os";
import { SENSITIVITY, sensitivityOf, type ReplySensitivity } from "@/lib/inbox/sensitivity";

const pct = (v?: number | null) => (v == null ? "" : `${Math.round(v * 100)}%`);

/**
 * The automatic answer to buyers (Sprint 22). Saving it on with a message is the owner's approval
 * of that message. "Generate with AI" asks the Content Creator for a first draft, which the owner
 * edits; nothing is sent until it is saved and switched on.
 */
export function AutoReplySettings() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const settings = useQuery({ queryKey: ["os-settings", orgSlug], queryFn: marketingOsApi.settings });
  const [draft, setDraft] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState<string | null>(null);
  const text = draft ?? settings.data?.inbox_reply_text ?? "";
  const prompt = promptDraft ?? settings.data?.inbox_comment_prompt ?? "";
  const save = useMutation({
    mutationFn: (s: Partial<OSSettings>) => marketingOsApi.saveSettings(s),
    onSuccess: (saved, sent) => {
      qc.setQueryData(["os-settings", orgSlug], saved);
      if ("inbox_intent_threshold" in sent) {
        toast.success("Saved");
        return;
      }
      setDraft(null);
      setPromptDraft(null);
      toast.success(saved.inbox_auto_reply ? "Automatic replies are on" : "Automatic replies saved and off");
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the automatic reply")),
  });
  const on = settings.data?.inbox_auto_reply ?? false;
  const sensitivity = sensitivityOf(settings.data?.inbox_intent_threshold, settings.data?.inbox_auto_reply_threshold);
  const dirty = draft !== null || promptDraft !== null;

  function setSensitivity(v: ReplySensitivity) {
    if (v === "custom") return;
    const bars = SENSITIVITY[v];
    save.mutate({ inbox_intent_threshold: bars.intent, inbox_auto_reply_threshold: bars.reply });
  }

  return (
    <GlassPanel>
      <div className="space-y-4">
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium">Answer buyers automatically</p>
            <p className="mt-1 text-sm text-muted-foreground">
              When someone asks about a price, delivery or stock, they get your message below. A comment gets it as a private message with a short public line under the comment. One automatic answer per person a day; complaints and anything unclear wait for you.
            </p>
          </div>
          <Switch
            checked={on}
            disabled={settings.isLoading || save.isPending || !text.trim()}
            onCheckedChange={(v: boolean) => save.mutate({ inbox_auto_reply: v, inbox_reply_text: text })}
            aria-label="Answer buyers automatically"
          />
        </div>
        <Field
          label="Your message"
          htmlFor="auto-reply-text"
          hint={`${text.length} of ${MAX_AUTO_REPLY}. {{booking_link}} and {{profile_link}} become your links.`}
          action={
            <AIFieldButton
              field="inbox_reply_text"
              label="Write it for me"
              form={() => ({ inbox_reply_text: text })}
              onResult={(s) => s.text && setDraft(s.text)}
            />
          }
        >
          <Textarea
            id="auto-reply-text"
            rows={3}
            maxLength={MAX_AUTO_REPLY}
            value={text}
            placeholder="Thanks for asking! See prices and order here: {{profile_link}}"
            onChange={(e) => setDraft(e.target.value)}
          />
        </Field>
        <Field
          label="Public line under a comment"
          htmlFor="auto-reply-prompt"
          hint={`${prompt.length} of ${MAX_COMMENT_PROMPT}. Shown under the comment when your message goes privately.`}
        >
          <Input
            id="auto-reply-prompt"
            maxLength={MAX_COMMENT_PROMPT}
            value={prompt}
            placeholder={DEFAULT_COMMENT_PROMPT}
            onChange={(e) => setPromptDraft(e.target.value)}
          />
        </Field>
        {dirty && (
          <Button
            size="sm"
            disabled={save.isPending}
            onClick={() => save.mutate({ inbox_auto_reply: on && !!text.trim(), inbox_reply_text: text, inbox_comment_prompt: prompt })}
          >
            Save message
          </Button>
        )}
        <div className="space-y-2">
          <p className="text-sm font-medium">How sure before marking and answering a buyer</p>
          <CapsuleTabs
            label="How sure before marking and answering a buyer"
            value={sensitivity}
            onChange={setSensitivity}
            options={[
              { value: "careful" as const, label: "Careful" },
              { value: "standard" as const, label: "Standard" },
              { value: "more" as const, label: "Answer more" },
              ...(sensitivity === "custom" ? [{ value: "custom" as const, label: "Custom" }] : []),
            ]}
          />
          <p className="text-xs text-muted-foreground">
            {sensitivity === "careful" && "Only clear questions are marked and answered. More messages wait for you."}
            {sensitivity === "standard" && "The default balance."}
            {sensitivity === "more" && "Less certain questions are marked and answered too. Check the inbox for replies that missed."}
            {sensitivity === "custom" &&
              `Marked from ${pct(settings.data?.inbox_intent_threshold) || "55%"} sure, answered from ${pct(settings.data?.inbox_auto_reply_threshold) || "70%"} sure.`}
          </p>
        </div>
      </div>
    </GlassPanel>
  );
}
