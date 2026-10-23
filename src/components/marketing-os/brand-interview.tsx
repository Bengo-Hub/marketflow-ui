"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiError, marketingOsApi, type BrandContext } from "@/lib/api/marketing-os";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

// The brand-context playbook's five questions, in the owner's words.
const QUESTIONS: { key: string; label: string; placeholder: string }[] = [
  { key: "sell", label: "What do you sell, and roughly what does it cost?", placeholder: "Shea butter body lotion, 250ml for KES 850, and a gift box for KES 2,400." },
  { key: "buyers", label: "Who buys it, and why do they buy it?", placeholder: "Mostly women 25 to 45 in Kisumu with dry skin who want something natural." },
  { key: "different", label: "Why do customers pick you over others?", placeholder: "Made by hand in small batches, no added fragrance, delivered the same day in town." },
  { key: "say", label: "What do happy customers say about you?", placeholder: "\"My skin stopped cracking in a week.\" \"It smells clean, not perfumed.\"" },
  { key: "never", label: "Anything the team must never say or promise?", placeholder: "Never say it cures eczema. Don't compare us to big brands by name." },
];

const MAX_ANSWER = 600;

/**
 * Five plain questions; the strategist turns the answers into a brand context
 * draft (1 credit). The draft fills the editor below for review: nothing is
 * saved until the owner presses Save.
 */
export function BrandInterview({ onDraft }: { onDraft: (bc: BrandContext) => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const answered = QUESTIONS.filter((q) => (answers[q.key] ?? "").trim()).length;
  const tooLong = QUESTIONS.some((q) => (answers[q.key] ?? "").length > MAX_ANSWER);

  const draft = useMutation({
    mutationFn: () => {
      const text =
        "Set up my brand profile from my answers.\n\n" +
        QUESTIONS.filter((q) => (answers[q.key] ?? "").trim())
          .map((q) => `${q.label}\n${answers[q.key].trim()}`)
          .join("\n\n");
      return marketingOsApi.ask({ text, playbook: "brand-context" });
    },
    onSuccess: (r) => {
      const step = r.result.steps?.find((s) => s.contract === "brand_context");
      if (step?.output) {
        onDraft(step.output as BrandContext);
        toast.success("Draft ready. Review it below, then save.");
      } else {
        toast.error(step?.error || "The strategist could not draft it this time. Try again in a minute.");
      }
    },
    onError: (e) => toast.error(apiError(e, "Could not draft the brand context")),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Not sure what to write? Answer five questions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {QUESTIONS.map((q) => (
          <label key={q.key} className="block space-y-1">
            <span className="text-sm font-medium">{q.label}</span>
            <Textarea
              rows={2}
              value={answers[q.key] ?? ""}
              placeholder={q.placeholder}
              aria-invalid={(answers[q.key] ?? "").length > MAX_ANSWER}
              onChange={(e) => setAnswers({ ...answers, [q.key]: e.target.value })}
            />
          </label>
        ))}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-muted-foreground">
            {draft.isPending
              ? "The strategist is writing your draft. This takes up to a minute."
              : "Your strategist turns this into the profile below. You review it before anything is saved."}
          </p>
          <Button onClick={() => draft.mutate()} disabled={answered < 2 || tooLong || draft.isPending} className="gap-2">
            {draft.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Draft it for me (1 credit)
          </Button>
        </div>
        {answered < 2 && <p className="text-xs text-muted-foreground">Answer at least two questions to start.</p>}
      </CardContent>
    </Card>
  );
}
