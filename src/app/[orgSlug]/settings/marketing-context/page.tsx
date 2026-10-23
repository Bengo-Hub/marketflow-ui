"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { apiError, marketingOsApi, type BrandContext } from "@/lib/api/marketing-os";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { BrandInterview } from "@/components/marketing-os/brand-interview";

// Server limits (marketflow-api marketingos.BrandContext.Validate).
const MAX_TEXT = 1200;
const MAX_ITEMS = 20;
const MAX_ITEM = 300;

type ListKey = "audience" | "offers" | "proof" | "voice_examples" | "banned_claims" | "learnings";

const LISTS: { key: ListKey; label: string; help: string; placeholder: string }[] = [
  {
    key: "audience",
    label: "Who you sell to",
    help: "One customer group per line.",
    placeholder: "Women 25 to 45 in Kisumu who buy natural skincare",
  },
  {
    key: "offers",
    label: "What you sell",
    help: "Products or services the team may promote, one per line.",
    placeholder: "Shea Butter Body Lotion 250ml, KES 850",
  },
  {
    key: "proof",
    label: "Proof you can stand behind",
    help: "Facts the team may quote: reviews, numbers, awards.",
    placeholder: "4.8 stars from 120 customer reviews",
  },
  {
    key: "voice_examples",
    label: "Sentences that sound like you",
    help: "Real lines from your posts or chats.",
    placeholder: "Karibu! Your skin will thank you.",
  },
  {
    key: "banned_claims",
    label: "Claims the team must never make",
    help: "The reviewer blocks any draft that says these.",
    placeholder: "Cures eczema",
  },
  {
    key: "learnings",
    label: "What has worked before",
    help: "The team adds lessons here over time; you can edit them.",
    placeholder: "Swahili hooks beat English hooks on TikTok",
  },
];

const empty: BrandContext = {
  positioning: "",
  audience: [],
  offers: [],
  proof: [],
  voice: "",
  voice_examples: [],
  banned_claims: [],
  learnings: [],
};

const toLines = (v?: string[]) => (v ?? []).join("\n");
const fromLines = (v: string) =>
  v
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);

/**
 * Brand context: what every member of the marketing team reads before writing.
 * Stored in Tenant.metadata.marketing_context by marketflow-api.
 */
export default function MarketingContextPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const qc = useQueryClient();

  const ctxQ = useQuery({ queryKey: ["os-brand-context", orgSlug], queryFn: marketingOsApi.brandContext });
  const settingsQ = useQuery({ queryKey: ["os-settings", orgSlug], queryFn: marketingOsApi.settings });

  const [text, setText] = useState({ positioning: "", voice: "" });
  const [lists, setLists] = useState<Record<ListKey, string>>({
    audience: "",
    offers: "",
    proof: "",
    voice_examples: "",
    banned_claims: "",
    learnings: "",
  });

  const fill = (src?: Partial<BrandContext>) => {
    const bc = { ...empty, ...(src ?? {}) };
    setText({ positioning: bc.positioning ?? "", voice: bc.voice ?? "" });
    setLists({
      audience: toLines(bc.audience),
      offers: toLines(bc.offers),
      proof: toLines(bc.proof),
      voice_examples: toLines(bc.voice_examples),
      banned_claims: toLines(bc.banned_claims),
      learnings: toLines(bc.learnings),
    });
  };
  useEffect(() => fill(ctxQ.data), [ctxQ.data]);

  const save = useMutation({
    mutationFn: () => {
      const bc: BrandContext = { ...empty, ...text };
      for (const l of LISTS) bc[l.key] = fromLines(lists[l.key]);
      return marketingOsApi.saveBrandContext(bc);
    },
    onSuccess: (saved) => {
      qc.setQueryData(["os-brand-context", orgSlug], saved);
      toast.success("Brand context saved");
    },
    onError: (e) => toast.error(apiError(e, "Could not save the brand context")),
  });

  const brief = useMutation({
    mutationFn: (on: boolean) => marketingOsApi.saveSettings({ daily_brief: on }),
    onSuccess: (saved) => {
      qc.setQueryData(["os-settings", orgSlug], saved);
      toast.success(saved.daily_brief ? "Morning brief turned on" : "Morning brief turned off");
    },
    onError: (e) => toast.error(apiError(e, "Could not change the morning brief")),
  });

  const listProblem = (key: ListKey) => {
    const items = fromLines(lists[key]);
    if (items.length > MAX_ITEMS) return `Keep it to ${MAX_ITEMS} lines (now ${items.length}).`;
    if (items.some((i) => i.length > MAX_ITEM)) return `Each line must be under ${MAX_ITEM} characters.`;
    return "";
  };
  const invalid =
    text.positioning.length > MAX_TEXT || text.voice.length > MAX_TEXT || LISTS.some((l) => listProblem(l.key));

  if (ctxQ.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Brand context</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your marketing team reads this before writing anything. The clearer it is, the less they ask and the
          closer the first draft lands.
        </p>
      </div>

      {ctxQ.error && (
        <div className="rounded border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {apiError(ctxQ.error, "Could not load the brand context")}
        </div>
      )}

      <BrandInterview
        onDraft={(bc) => {
          // Keep what the team has learned so far; the interview does not know it.
          const learned = fromLines(lists.learnings);
          fill({ ...bc, learnings: learned.length ? learned : bc.learnings });
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Positioning and voice</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">What you do and why customers pick you</span>
            <Textarea
              rows={3}
              value={text.positioning}
              placeholder="Handmade shea butter skincare from Kisumu, made in small batches with no added fragrance."
              onChange={(e) => setText({ ...text, positioning: e.target.value })}
            />
            <span className="text-xs text-muted-foreground">
              {text.positioning.length}/{MAX_TEXT}
            </span>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">How you sound</span>
            <Textarea
              rows={2}
              value={text.voice}
              placeholder="Warm, plain and local. Mixes Swahili greetings with English. Never pushy."
              onChange={(e) => setText({ ...text, voice: e.target.value })}
            />
          </label>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Facts the team works from</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          {LISTS.map((l) => {
            const problem = listProblem(l.key);
            return (
              <label key={l.key} className="block space-y-1">
                <span className="text-sm font-medium">{l.label}</span>
                <Textarea
                  rows={4}
                  value={lists[l.key]}
                  placeholder={l.placeholder}
                  aria-invalid={!!problem}
                  onChange={(e) => setLists({ ...lists, [l.key]: e.target.value })}
                />
                <span className={problem ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                  {problem || l.help}
                </span>
              </label>
            );
          })}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={() => save.mutate()} disabled={invalid || save.isPending}>
          {save.isPending ? "Saving…" : "Save brand context"}
        </Button>
      </div>

      <Card>
        <CardContent className="flex items-start justify-between gap-6 py-5">
          <div>
            <p className="text-sm font-medium">Morning brief by email</p>
            <p className="mt-1 text-sm text-muted-foreground">
              At 6:30 each morning, admins get one page: yesterday&apos;s customers, leads and spend against the
              7-day average, and the three changes worth acting on.
            </p>
          </div>
          <Switch
            checked={settingsQ.data?.daily_brief ?? true}
            disabled={settingsQ.isLoading || brief.isPending}
            onCheckedChange={(v) => brief.mutate(v)}
            aria-label="Morning brief by email"
          />
        </CardContent>
      </Card>
    </div>
  );
}
