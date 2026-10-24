"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronDown, Rocket } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, Field, PageHeader, ToneBadge } from "@/components/ui-kit";
import { useBrandDraft, useChecklist, useDismissChecklist } from "@/hooks/use-onboarding";
import { useTenantProfile, useUpdateTenantProfile } from "@/hooks/use-tenant-profile";
import { apiErrorMessage } from "@/lib/api/errors";
import { marketingOsApi } from "@/lib/api/marketing-os";
import { STEP_META, type BrandDraft, type StepKey } from "@/lib/api/onboarding";
import type { Offering } from "@/lib/api/public";
import type { TenantProfile } from "@/lib/api/tenant-profile";
import { cn } from "@/lib/utils";

const MAX_OFFERINGS = 24; // marketflow-api tenant.maxOfferings

function ProfileStep({ profile, draft, onDone }: { profile: TenantProfile; draft?: BrandDraft; onDone: () => void }) {
  const update = useUpdateTenantProfile();
  const m = profile.metadata ?? {};
  const [form, setForm] = useState({
    tagline: (m.tagline as string) ?? "",
    bio: (m.bio as string) ?? "",
    contact_email: (m.contact_email as string) || draft?.profile.contact_email || "",
    whatsapp_number: profile.whatsapp_number || draft?.profile.whatsapp_number || "",
  });
  const logo = !(m.logo_url as string) ? draft?.profile.logo_url : undefined;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        update.mutate(
          {
            whatsapp_number: form.whatsapp_number.trim() || undefined,
            metadata: {
              tagline: form.tagline.trim(),
              bio: form.bio.trim(),
              contact_email: form.contact_email.trim(),
              ...(logo ? { logo_url: logo } : {}),
            },
          },
          { onSuccess: onDone },
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Tagline" htmlFor="ob-tag" hint="One line under your name"><Input id="ob-tag" maxLength={120} value={form.tagline} onChange={(e) => setForm({ ...form, tagline: e.target.value })} placeholder="Fresh groceries, delivered the same day" /></Field>
        <Field label="Contact email" htmlFor="ob-mail"><Input id="ob-mail" type="email" inputMode="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} /></Field>
        <Field label="Your story" htmlFor="ob-bio" hint="Two or three sentences" className="sm:col-span-2"><Textarea id="ob-bio" rows={3} maxLength={600} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} /></Field>
        <Field label="WhatsApp number" htmlFor="ob-wa" hint="Customers tap to chat with you"><Input id="ob-wa" type="tel" inputMode="tel" value={form.whatsapp_number} onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })} placeholder="+2547..." /></Field>
      </div>
      {logo && <p className="text-xs text-muted-foreground">Your account logo will be used on your public page.</p>}
      <Button type="submit" disabled={update.isPending || !form.tagline.trim() || !form.bio.trim()}>{update.isPending ? "Saving..." : "Save profile"}</Button>
    </form>
  );
}

function OfferingsStep({ profile, draft, onDone }: { profile: TenantProfile; draft?: BrandDraft; onDone: () => void }) {
  const update = useUpdateTenantProfile();
  const existing = (Array.isArray(profile.metadata?.offerings) ? profile.metadata?.offerings : []) as Offering[];
  const names = new Set(existing.map((o) => o.name));
  const options = (draft?.offerings ?? []).filter((o) => !names.has(o.name));
  const room = Math.max(0, MAX_OFFERINGS - existing.length);
  const [picked, setPicked] = useState<Set<string>>(() => new Set(options.slice(0, Math.min(8, room)).map((o) => o.name)));

  if (!draft) return <div className="h-24 animate-pulse rounded-xl bg-muted" />;
  if (options.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {existing.length ? "Everything we found is already on your page." : "We found no products yet. Add them in Inventory or POS, or "}
        {!existing.length && <Link href={`../settings/profile`} className="font-medium text-primary hover:underline">type them in your profile</Link>}
      </p>
    );
  }
  const toggle = (n: string) =>
    setPicked((p) => {
      const next = new Set(p);
      if (next.has(n)) next.delete(n);
      else if (next.size < room) next.add(n);
      return next;
    });
  const save = () => {
    const add: Offering[] = options
      .filter((o) => picked.has(o.name))
      .map((o) => ({ name: o.name, description: o.description, image_url: o.image_url, price_label: o.price_label, url: o.url }));
    update.mutate({ metadata: { offerings: [...existing, ...add] } }, { onSuccess: onDone });
  };
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{draft.sources.includes("catalogue") ? "Your best sellers from the last 90 days come first." : "From your catalogue."} Pick what to show.</p>
      <ul className="grid gap-2 sm:grid-cols-2">
        {options.map((o) => (
          <li key={o.name}>
            <label className={cn("flex cursor-pointer items-center gap-3 rounded-xl border p-3 transition-colors", picked.has(o.name) ? "border-primary/40 bg-primary/5" : "border-border bg-background/60 hover:bg-accent/40")}>
              <Checkbox checked={picked.has(o.name)} onCheckedChange={() => toggle(o.name)} aria-label={o.name} />
              {o.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={o.image_url} alt="" loading="lazy" className="size-10 shrink-0 rounded-lg object-cover" />
              ) : (
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-sm font-semibold text-muted-foreground">{o.name.slice(0, 1)}</span>
              )}
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{o.name}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {[o.price_label, o.quantity_sold ? `${Math.round(o.quantity_sold).toLocaleString()} sold` : ""].filter(Boolean).join(", ") || " "}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <Button disabled={picked.size === 0 || update.isPending} onClick={save}>
        {update.isPending ? "Adding..." : `Add ${picked.size} to my page`}
      </Button>
    </div>
  );
}

function BrandStep({ draft, onDone }: { draft?: BrandDraft; onDone: () => void }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const use = useMutation({
    mutationFn: () => marketingOsApi.saveBrandContext(draft!.suggested),
    onSuccess: (saved) => {
      qc.setQueryData(["os-brand-context", orgSlug], saved);
      toast.success("Brief saved. Fine-tune it any time.");
      onDone();
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not save the brief")),
  });
  if (!draft) return <div className="h-24 animate-pulse rounded-xl bg-muted" />;
  const s = draft.suggested;
  return (
    <div className="space-y-3">
      <dl className="grid gap-2 text-sm sm:grid-cols-3">
        <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">What you do</dt><dd className="mt-1 line-clamp-3">{s.positioning || "Not found yet"}</dd></div>
        <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">What you sell</dt><dd className="mt-1">{s.offers.length ? `${s.offers.length} items` : "Not found yet"}</dd></div>
        <div className="rounded-xl bg-muted/50 p-3"><dt className="text-xs text-muted-foreground">Who you sell to</dt><dd className="mt-1">{s.audience.length ? `${s.audience.length} groups` : "Add this yourself"}</dd></div>
      </dl>
      <div className="flex flex-wrap gap-2">
        <Button disabled={use.isPending || (!s.positioning && s.offers.length === 0)} onClick={() => use.mutate()}>{use.isPending ? "Saving..." : "Use this as a start"}</Button>
        <Link href={`/${orgSlug}/settings/marketing-context`} className={buttonVariants({ variant: "outline" })}>Open the full brief</Link>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const checklist = useChecklist();
  const profile = useTenantProfile();
  const draft = useBrandDraft(true);
  const dismiss = useDismissChecklist();
  const [open, setOpen] = useState<StepKey | null>(null);
  const refresh = () => {
    setOpen(null);
    void qc.invalidateQueries({ queryKey: ["onboarding"] });
  };

  if (checklist.isError) return <ErrorState message="Could not load your setup steps." onRetry={() => void checklist.refetch()} />;
  const c = checklist.data;
  const pct = c && c.total ? Math.round((c.done / c.total) * 100) : 0;
  const inline: Partial<Record<StepKey, boolean>> = { profile: true, offerings: true, brand_context: true };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader icon={<Rocket />} title="Set up MarketFlow" description="A few steps and your public page, assistant and campaigns work from your own business data." />

      <div className="glass rounded-[1.25rem] p-5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="font-display text-lg font-semibold">{c?.complete ? "You're all set" : `${c?.done ?? 0} of ${c?.total ?? 5} done`}</p>
          <span className="text-sm text-muted-foreground tabular">{pct}%</span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Setup progress">
          <div className="h-full rounded-full bg-primary transition-[width] duration-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ol className="space-y-3">
        {checklist.isLoading
          ? [0, 1, 2, 3, 4].map((i) => <li key={i} className="glass h-20 animate-pulse rounded-[1.25rem]" />)
          : (c?.steps ?? []).map((st, i) => {
              const meta = STEP_META[st.key];
              const expanded = open === st.key;
              return (
                <li key={st.key} className={cn("glass rounded-[1.25rem] p-4 sm:p-5", st.done && "opacity-80")}>
                  <div className="flex items-start gap-3">
                    <span className={cn("grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold", st.done ? "bg-success/15 text-success" : "bg-primary/10 text-primary")}>
                      {st.done ? <Check className="size-4" /> : i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="font-display text-base font-semibold">{meta.title}</h2>
                        {st.optional && <ToneBadge>Optional</ToneBadge>}
                        {st.done && <ToneBadge tone="success">Done</ToneBadge>}
                      </div>
                      <p className="mt-0.5 text-sm text-muted-foreground">{meta.blurb}</p>
                    </div>
                    {inline[st.key] ? (
                      <Button variant={st.done ? "ghost" : "outline"} size="sm" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : st.key)}>
                        {st.done ? "Review" : "Start"} <ChevronDown className={cn("transition-transform", expanded && "rotate-180")} />
                      </Button>
                    ) : (
                      <Link href={`/${orgSlug}${meta.href}`} className={buttonVariants({ variant: st.done ? "ghost" : "outline", size: "sm" })}>{meta.action}</Link>
                    )}
                  </div>
                  {expanded && (
                    <div className="mt-4 border-t border-border pt-4">
                      {draft.isError && <p className="mb-3 text-sm text-warning">We couldn&apos;t read your other Codevertex apps just now, so fill this in yourself.</p>}
                      {profile.data && st.key === "profile" && <ProfileStep key={draft.data ? "with" : "without"} profile={profile.data} draft={draft.data} onDone={refresh} />}
                      {profile.data && st.key === "offerings" && <OfferingsStep key={draft.data ? "with" : "without"} profile={profile.data} draft={draft.data} onDone={refresh} />}
                      {st.key === "brand_context" && <BrandStep draft={draft.data} onDone={refresh} />}
                      {profile.isLoading && st.key !== "brand_context" && <div className="h-24 animate-pulse rounded-xl bg-muted" />}
                    </div>
                  )}
                </li>
              );
            })}
      </ol>

      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href={`/${orgSlug}/dashboard`} className="font-medium text-primary hover:underline">Go to the dashboard</Link>
        {c && !c.dismissed && (
          <Button variant="ghost" disabled={dismiss.isPending} onClick={() => dismiss.mutate(true)}>Hide the setup guide</Button>
        )}
      </div>
    </div>
  );
}
