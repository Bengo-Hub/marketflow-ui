"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Compass, Database, MessageSquareText, Plus } from "lucide-react";
import { apiError, marketingOsApi, type BrandContext } from "@/lib/api/marketing-os";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, Field, GlassPanel, ListEditor, PageHeader, ToneBadge } from "@/components/ui-kit";
import { BrandInterview } from "@/components/marketing-os/brand-interview";
import { useBrandDraft } from "@/hooks/use-onboarding";
import { cn } from "@/lib/utils";

// Server limits (marketflow-api marketingos.BrandContext.Validate).
const MAX_TEXT = 1200;

type ListKey = "audience" | "offers" | "proof" | "voice_examples" | "banned_claims" | "learnings";

const LISTS: { key: ListKey; label: string; help: string; placeholder: string }[] = [
  { key: "audience", label: "Who you sell to", help: "One customer group per item.", placeholder: "Women 25 to 45 in Kisumu who buy natural skincare" },
  { key: "offers", label: "What you sell", help: "Products or services the team may promote.", placeholder: "Shea Butter Body Lotion 250ml (KES 850)" },
  { key: "proof", label: "Proof you can stand behind", help: "Reviews, numbers or awards the team may quote.", placeholder: "4.8 stars from 120 customer reviews" },
  { key: "voice_examples", label: "Sentences that sound like you", help: "Real lines from your posts or chats.", placeholder: "Karibu! Your skin will thank you." },
  { key: "banned_claims", label: "Claims the team must never make", help: "The reviewer blocks any draft that says these.", placeholder: "Cures eczema" },
  { key: "learnings", label: "What has worked before", help: "The team adds lessons here over time; you can edit them.", placeholder: "Swahili hooks beat English hooks on TikTok" },
];

const EMPTY: BrandContext = { positioning: "", audience: [], offers: [], proof: [], voice: "", voice_examples: [], banned_claims: [], learnings: [] };

const SOURCE_LABEL: Record<string, string> = {
  profile: "your profile",
  account: "your account details",
  catalogue: "your best sellers",
  website: "the Codevertex website",
};

function normalise(bc?: Partial<BrandContext> | null): BrandContext {
  const b = { ...EMPTY, ...(bc ?? {}) };
  for (const l of LISTS) b[l.key] = b[l.key] ?? [];
  return b;
}

/** Fills only what is empty in `form` from `src`, so nothing the owner wrote is replaced. */
function fillEmpty(form: BrandContext, src: BrandContext): BrandContext {
  const out = { ...form };
  if (!out.positioning.trim()) out.positioning = src.positioning ?? "";
  if (!out.voice.trim()) out.voice = src.voice ?? "";
  for (const l of LISTS) if (out[l.key].length === 0) out[l.key] = src[l.key] ?? [];
  return out;
}

function BrandForm({ saved, orgSlug }: { saved: BrandContext; orgSlug: string }) {
  const qc = useQueryClient();
  const [form, setForm] = useState<BrandContext>(saved);
  const [wantDraft, setWantDraft] = useState(false);
  const [interview, setInterview] = useState(false);
  const draft = useBrandDraft(wantDraft);
  const dirty = JSON.stringify(form) !== JSON.stringify(saved);

  const save = useMutation({
    mutationFn: () => marketingOsApi.saveBrandContext(form),
    onSuccess: (next) => {
      qc.setQueryData(["os-brand-context", orgSlug], next);
      void qc.invalidateQueries({ queryKey: ["onboarding"] });
      toast.success("Brand context saved");
    },
    onError: (e) => toast.error(apiError(e, "Could not save the brand context")),
  });

  const missing = [
    !form.positioning.trim() && "what you do",
    form.audience.length === 0 && "who you sell to",
    form.offers.length === 0 && "what you sell",
  ].filter(Boolean) as string[];
  const tooLong = form.positioning.length > MAX_TEXT || form.voice.length > MAX_TEXT;

  const applyDraft = () => {
    if (!draft.data) return;
    const next = fillEmpty(form, normalise(draft.data.suggested));
    const changed = JSON.stringify(next) !== JSON.stringify(form);
    setForm(next);
    toast[changed ? "success" : "info"](changed ? "Empty fields filled. Review them, then save." : "Every field already has your own words; nothing was replaced.");
  };

  const addOffer = (line: string) => {
    if (form.offers.includes(line) || form.offers.length >= 20) return;
    setForm({ ...form, offers: [...form.offers, line] });
  };

  const sources = (draft.data?.sources ?? []).map((s) => SOURCE_LABEL[s]).filter(Boolean);
  const suggestions = (draft.data?.offerings ?? []).map((o) => (o.price_label ? `${o.name} (${o.price_label})` : o.name));

  return (
    <div className="space-y-6 pb-24 md:pb-0">
      <PageHeader
        icon={<Compass />}
        title="Brand context"
        description="Your marketing team reads this before writing anything. The clearer it is, the closer the first draft lands."
        actions={
          <Button className="hidden md:inline-flex" disabled={!dirty || tooLong || save.isPending} onClick={() => save.mutate()}>
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        }
      />

      <GlassPanel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 gap-3">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Database className="size-5" /></div>
            <div className="min-w-0">
              <h2 className="font-display text-base font-semibold">Start from what your business already has</h2>
              <p className="text-sm text-muted-foreground">
                {draft.data
                  ? sources.length
                    ? `Found in ${sources.join(", ")}. Only empty fields are filled.`
                    : "Nothing to suggest yet. Add products in Inventory or POS, or fill the profile first."
                  : "We read your profile, account details and best sellers. Only empty fields are filled; nothing is saved until you save."}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {!draft.data ? (
              <Button variant="outline" disabled={draft.isFetching} onClick={() => setWantDraft(true)}>
                {draft.isFetching ? "Looking..." : "Fill from my business data"}
              </Button>
            ) : (
              <Button variant="outline" onClick={applyDraft}>Fill empty fields</Button>
            )}
            <Button variant="ghost" onClick={() => setInterview((v) => !v)}>
              <MessageSquareText /> {interview ? "Hide the questions" : "Answer five questions"}
            </Button>
          </div>
        </div>
        {draft.isError && <p className="mt-3 text-sm text-destructive">{apiError(draft.error, "Could not gather your business data. Try again.")}</p>}
        {suggestions.length > 0 && (
          <div className="mt-4 border-t border-border pt-4">
            <p className="mb-2 text-sm font-medium">Your products and services</p>
            <ul className="flex flex-wrap gap-1.5">
              {suggestions.map((s) => {
                const added = form.offers.includes(s);
                return (
                  <li key={s}>
                    <button
                      type="button"
                      disabled={added || form.offers.length >= 20}
                      onClick={() => addOffer(s)}
                      className={cn(
                        "inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm transition-colors",
                        added ? "border-primary/30 bg-primary/10 text-primary" : "border-border bg-background/70 hover:border-primary/40",
                      )}
                    >
                      {added ? <Check className="size-3.5" /> : <Plus className="size-3.5" />} {s}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </GlassPanel>

      {interview && (
        <BrandInterview
          onDraft={(bc) => {
            // Keep what the team has learned so far; the interview does not know it.
            const next = normalise(bc);
            setForm({ ...next, learnings: form.learnings.length ? form.learnings : next.learnings });
            setInterview(false);
          }}
        />
      )}

      {missing.length > 0 && (
        <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          Still missing: {missing.map((m) => <ToneBadge key={m} tone="warning">{m}</ToneBadge>)}
        </p>
      )}

      <GlassPanel title="Positioning and voice">
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Field label="What you do and why customers pick you" htmlFor="bc-pos" hint={`${form.positioning.length}/${MAX_TEXT}`} error={form.positioning.length > MAX_TEXT ? `Keep it under ${MAX_TEXT} characters.` : undefined}>
            <Textarea id="bc-pos" rows={4} value={form.positioning} placeholder="Handmade shea butter skincare from Kisumu, made in small batches with no added fragrance." onChange={(e) => setForm({ ...form, positioning: e.target.value })} />
          </Field>
          <Field label="How you sound" htmlFor="bc-voice" hint={`${form.voice.length}/${MAX_TEXT}`} error={form.voice.length > MAX_TEXT ? `Keep it under ${MAX_TEXT} characters.` : undefined}>
            <Textarea id="bc-voice" rows={4} value={form.voice} placeholder="Warm, plain and local. Mixes Swahili greetings with English. Never pushy." onChange={(e) => setForm({ ...form, voice: e.target.value })} />
          </Field>
        </div>
      </GlassPanel>

      {/* grid-cols-1 + min-w-0: an implicit grid column would grow to the widest chip's text. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {LISTS.map((l) => (
          <GlassPanel key={l.key} title={l.label} description={l.help} className="min-w-0">
            <ListEditor label={l.label.toLowerCase()} value={form[l.key]} placeholder={l.placeholder} onChange={(v) => setForm({ ...form, [l.key]: v })} />
          </GlassPanel>
        ))}
      </div>

      {dirty && (
        <div className="glass-strong fixed inset-x-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-30 flex items-center justify-between gap-3 rounded-2xl p-3 shadow-lift md:sticky md:inset-x-auto md:bottom-4">
          <p className="text-sm font-medium">You have unsaved changes</p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setForm(saved)}>Undo</Button>
            <Button disabled={tooLong || save.isPending} onClick={() => save.mutate()}>{save.isPending ? "Saving..." : "Save"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Brand context: what every member of the marketing team reads before writing.
 * Stored in Tenant.metadata.marketing_context by marketflow-api (marketingos is the only writer).
 */
export default function MarketingContextPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const ctxQ = useQuery({ queryKey: ["os-brand-context", orgSlug], queryFn: marketingOsApi.brandContext });
  const settingsQ = useQuery({ queryKey: ["os-settings", orgSlug], queryFn: marketingOsApi.settings });

  const brief = useMutation({
    mutationFn: (on: boolean) => marketingOsApi.saveSettings({ daily_brief: on }),
    onSuccess: (saved) => {
      qc.setQueryData(["os-settings", orgSlug], saved);
      toast.success(saved.daily_brief ? "Morning brief turned on" : "Morning brief turned off");
    },
    onError: (e) => toast.error(apiError(e, "Could not change the morning brief")),
  });

  if (ctxQ.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-16 animate-pulse rounded-2xl bg-muted" />
        <div className="glass h-40 animate-pulse rounded-[1.25rem]" />
        <div className="grid gap-4 lg:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="glass h-36 animate-pulse rounded-[1.25rem]" />)}</div>
      </div>
    );
  }
  if (ctxQ.isError) return <ErrorState message={apiError(ctxQ.error, "Could not load the brand context")} onRetry={() => void ctxQ.refetch()} />;

  const saved = normalise(ctxQ.data);
  return (
    <div className="space-y-6">
      {/* Keyed on the saved value so a save or refetch resets the form to what the server holds. */}
      <BrandForm key={JSON.stringify(saved)} saved={saved} orgSlug={orgSlug} />
      <GlassPanel>
        <div className="flex items-start justify-between gap-6">
          <div>
            <p className="text-sm font-medium">Morning brief by email</p>
            <p className="mt-1 text-sm text-muted-foreground">
              At 6:30 each morning, admins get one page: yesterday&apos;s customers, leads and spend against the 7-day average, and the three changes worth acting on.
            </p>
          </div>
          <Switch
            checked={settingsQ.data?.daily_brief ?? true}
            disabled={settingsQ.isLoading || brief.isPending}
            onCheckedChange={(v: boolean) => brief.mutate(v)}
            aria-label="Morning brief by email"
          />
        </div>
      </GlassPanel>
    </div>
  );
}
