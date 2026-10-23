"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, CircleAlert, ExternalLink, Save, UserCircle } from "lucide-react";
import { PhoneInputField, CountrySelect } from "@bengo-hub/shared-ui-lib/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, Field, GlassPanel, PageHeader } from "@/components/ui-kit";
import { OfferingsEditor } from "@/components/public-profile/offerings-editor";
import { useTenantProfile, useUpdateTenantProfile } from "@/hooks/use-tenant-profile";
import type { Offering, PublicMetadata, Socials } from "@/lib/api/public";
import type { TenantProfileUpdate } from "@/lib/api/tenant-profile";
import { publicProfileUrl } from "@/lib/urls";

/** The public metadata keys this form edits (marketflow-api tenant.PublicMetadataKeys). */
type Meta = Pick<
  PublicMetadata,
  "tagline" | "bio" | "story" | "video_url" | "logo_url" | "cover_url" | "contact_email" | "booking_enabled" | "brand_primary_color" | "opportunity_text"
> & { socials: Socials; offerings: Offering[] };

const SOCIALS: Array<{ key: keyof Socials; label: string }> = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "tiktok", label: "TikTok" },
  { key: "youtube", label: "YouTube" },
  { key: "website", label: "Website" },
];

const isHttp = (v?: string) => !v || /^https?:\/\/\S+$/i.test(v.trim());

export default function ProfileSettingsPage() {
  const { data, isLoading, error, refetch } = useTenantProfile();
  const save = useUpdateTenantProfile();
  const [form, setForm] = useState<Required<Omit<TenantProfileUpdate, "metadata">>>({
    name: "",
    whatsapp_number: "",
    fbo_distrib_id: "",
    flp_store_code: "",
    flp_language: "",
    country: "",
  });
  const [meta, setMeta] = useState<Meta>({ socials: {}, offerings: [] });

  useEffect(() => {
    if (!data) return;
    const m = data.metadata ?? {};
    setForm({
      name: data.name ?? "",
      whatsapp_number: data.whatsapp_number ?? "",
      fbo_distrib_id: data.fbo_distrib_id ?? "",
      flp_store_code: data.flp_store_code ?? "",
      flp_language: data.flp_language ?? "",
      country: data.country ?? "",
    });
    setMeta({
      tagline: m.tagline,
      bio: m.bio,
      story: m.story,
      video_url: m.video_url,
      logo_url: m.logo_url,
      cover_url: m.cover_url,
      contact_email: m.contact_email,
      booking_enabled: m.booking_enabled,
      brand_primary_color: m.brand_primary_color,
      opportunity_text: m.opportunity_text,
      socials: (m.socials as Socials) ?? {},
      offerings: Array.isArray(m.offerings) ? (m.offerings as Offering[]) : [],
    });
  }, [data]);

  const isFLP = data?.business_type === "flp";
  const errors = useMemo(() => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Enter your business name.";
    for (const k of ["video_url", "logo_url", "cover_url"] as const) if (!isHttp(meta[k])) e[k] = "Use a full link starting with https://";
    if (meta.contact_email && !/^\S+@\S+\.\S+$/.test(meta.contact_email)) e.contact_email = "Enter a valid email address.";
    if (meta.offerings.some((o) => !o.name.trim())) e.offerings = "Every item needs a name, or remove the empty ones.";
    if (meta.offerings.some((o) => !isHttp(o.image_url) || !isHttp(o.url))) e.offerings = "Item links must start with https://";
    for (const s of SOCIALS) if (!isHttp(meta.socials[s.key])) e[`social_${s.key}`] = "Use a full link starting with https://";
    return e;
  }, [form, meta]);

  if (error) return <ErrorState message="Could not load your profile." onRetry={() => void refetch()} />;
  if (isLoading || !data) {
    return (
      <div className="mx-auto max-w-4xl space-y-4" aria-busy>
        {[0, 1, 2].map((i) => (
          <div key={i} className="glass h-48 animate-pulse rounded-[1.25rem]" />
        ))}
      </div>
    );
  }

  const missing = [
    !form.whatsapp_number && !meta.contact_email ? "WhatsApp number or email" : null,
    !meta.bio ? "Bio" : null,
    !meta.logo_url ? "Logo" : null,
    meta.offerings.length === 0 ? "Products or services" : null,
    isFLP && !form.fbo_distrib_id ? "Distributor ID" : null,
  ].filter(Boolean) as string[];
  const url = publicProfileUrl(data.slug);
  const hasErrors = Object.keys(errors).length > 0;
  const setM = (patch: Partial<Meta>) => setMeta((m) => ({ ...m, ...patch }));

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (hasErrors) return;
    const socials = Object.fromEntries(Object.entries(meta.socials).filter(([, v]) => v && v.trim()));
    save.mutate({
      ...form,
      metadata: {
        ...meta,
        socials,
        offerings: meta.offerings.map((o) => ({ ...o, name: o.name.trim() })),
      },
    });
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-4xl space-y-6" noValidate>
      <PageHeader
        icon={<UserCircle />}
        title="Public profile"
        description={
          <>
            Your page lives at{" "}
            <a href={url} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
              /p/{data.slug}
            </a>
          </>
        }
        actions={
          <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-sm font-medium hover:bg-muted">
            <ExternalLink className="h-4 w-4" />
            View page
          </a>
        }
      />

      {missing.length > 0 ? (
        <div className="flex items-start gap-3 rounded-2xl border border-warning/25 bg-warning/10 p-4 text-sm">
          <CircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
          <div>
            <p className="font-medium text-foreground">Your page is missing: {missing.join(", ")}.</p>
            <p className="mt-0.5 text-muted-foreground">Complete pages get more enquiries.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-2xl border border-success/25 bg-success/10 p-4 text-sm text-foreground">
          <CheckCircle2 className="h-5 w-5 text-success" />
          Your page has everything it needs.
        </div>
      )}

      <GlassPanel title="About you" description="The top of your public page.">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Business name" required error={errors.name} htmlFor="pf-name">
            <Input id="pf-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>
          <Field label="Tagline" hint="A few words under your name." htmlFor="pf-tagline">
            <Input id="pf-tagline" maxLength={80} value={meta.tagline ?? ""} onChange={(e) => setM({ tagline: e.target.value })} placeholder={isFLP ? "Forever Business Owner" : "Bridal and events makeup in Nairobi"} />
          </Field>
          <Field label="Bio" hint="Two or three sentences about you and what you offer." className="md:col-span-2" htmlFor="pf-bio">
            <Textarea id="pf-bio" rows={3} value={meta.bio ?? ""} onChange={(e) => setM({ bio: e.target.value })} />
          </Field>
          <Field label={isFLP ? "Your Forever story" : "Your story"} hint="Shown next to your video. Leave a blank line between paragraphs." className="md:col-span-2" htmlFor="pf-story">
            <Textarea id="pf-story" rows={5} value={meta.story ?? ""} onChange={(e) => setM({ story: e.target.value })} />
          </Field>
          <Field label="Video link" hint="A YouTube or Vimeo link." error={errors.video_url} className="md:col-span-2" htmlFor="pf-video">
            <Input id="pf-video" inputMode="url" value={meta.video_url ?? ""} onChange={(e) => setM({ video_url: e.target.value })} placeholder="https://www.youtube.com/watch?v=..." />
          </Field>
        </div>
      </GlassPanel>

      <GlassPanel title={isFLP ? "Featured products" : "Products and services"} description="What visitors see in the list on your page.">
        <OfferingsEditor value={meta.offerings} onChange={(offerings) => setM({ offerings })} isFLP={isFLP} />
        {errors.offerings && <p role="alert" className="mt-3 text-sm text-destructive">{errors.offerings}</p>}
      </GlassPanel>

      <GlassPanel title="Contact and booking">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="WhatsApp number" hint="Visitors chat with you here.">
            <PhoneInputField value={form.whatsapp_number} onChange={(v) => setForm({ ...form, whatsapp_number: v })} />
          </Field>
          <Field label="Country">
            <CountrySelect value={form.country} onChange={(v) => setForm({ ...form, country: v })} />
          </Field>
          <Field label="Contact email" hint="Shown when there is no WhatsApp number." error={errors.contact_email} htmlFor="pf-email">
            <Input id="pf-email" type="email" autoComplete="email" value={meta.contact_email ?? ""} onChange={(e) => setM({ contact_email: e.target.value })} />
          </Field>
          <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-background/60 p-4">
            <div>
              <p className="text-sm font-medium">Online booking</p>
              <p className="text-xs text-muted-foreground">Visitors pick a free time from your connected Google Calendar.</p>
            </div>
            <Switch checked={meta.booking_enabled !== false} onCheckedChange={(v) => setM({ booking_enabled: v })} aria-label="Online booking" />
          </div>
        </div>
      </GlassPanel>

      <GlassPanel title="Look and links">
        <div className="grid gap-5 md:grid-cols-2">
          <Field label="Logo link" hint="A square image works best." error={errors.logo_url} htmlFor="pf-logo">
            <Input id="pf-logo" inputMode="url" value={meta.logo_url ?? ""} onChange={(e) => setM({ logo_url: e.target.value })} placeholder="https://..." />
          </Field>
          <Field label="Cover photo link" hint="A wide photo for the top of the page." error={errors.cover_url} htmlFor="pf-cover">
            <Input id="pf-cover" inputMode="url" value={meta.cover_url ?? ""} onChange={(e) => setM({ cover_url: e.target.value })} placeholder="https://..." />
          </Field>
          <Field
            label="Page colour"
            hint="Your workspace uses the colour set in your Codevertex account; this one only changes the public page."
            htmlFor="pf-color"
          >
            <div className="flex items-center gap-3">
              <input
                id="pf-color"
                type="color"
                value={/^#[0-9a-f]{6}$/i.test(meta.brand_primary_color ?? "") ? meta.brand_primary_color : "#9100b0"}
                onChange={(e) => setM({ brand_primary_color: e.target.value })}
                className="h-10 w-14 cursor-pointer rounded-xl border border-input bg-background p-1"
              />
              {meta.brand_primary_color && (
                <Button type="button" variant="ghost" size="sm" onClick={() => setM({ brand_primary_color: "" })}>
                  Use account colour
                </Button>
              )}
            </div>
          </Field>
          {SOCIALS.map((s) => (
            <Field key={s.key} label={s.label} error={errors[`social_${s.key}`]} htmlFor={`pf-${s.key}`}>
              <Input
                id={`pf-${s.key}`}
                inputMode="url"
                value={meta.socials[s.key] ?? ""}
                onChange={(e) => setM({ socials: { ...meta.socials, [s.key]: e.target.value } })}
                placeholder="https://..."
              />
            </Field>
          ))}
        </div>
      </GlassPanel>

      {isFLP && (
        <GlassPanel title="Forever Living" description="Links your products and the join form to your own Forever shop.">
          <div className="grid gap-5 md:grid-cols-3">
            <Field label="Distributor ID" htmlFor="pf-did">
              <Input id="pf-did" value={form.fbo_distrib_id} onChange={(e) => setForm({ ...form, fbo_distrib_id: e.target.value })} />
            </Field>
            <Field label="Store code" hint="KEN for Kenya." htmlFor="pf-store">
              <Input id="pf-store" value={form.flp_store_code} onChange={(e) => setForm({ ...form, flp_store_code: e.target.value.toUpperCase() })} placeholder="KEN" />
            </Field>
            <Field label="Language" htmlFor="pf-lang">
              <Input id="pf-lang" value={form.flp_language} onChange={(e) => setForm({ ...form, flp_language: e.target.value.toLowerCase() })} placeholder="en" />
            </Field>
            <Field label="Opportunity text" hint="No income figures or promises: Forever's rules. The income disclosure link is added for you." className="md:col-span-3" htmlFor="pf-opp">
              <Textarea id="pf-opp" rows={4} value={meta.opportunity_text ?? ""} onChange={(e) => setM({ opportunity_text: e.target.value })} />
            </Field>
          </div>
        </GlassPanel>
      )}

      <div className="sticky bottom-[calc(5rem+env(safe-area-inset-bottom))] z-10 flex items-center justify-end gap-3 lg:bottom-4">
        {hasErrors && <p className="text-sm text-destructive">Fix the highlighted fields to save.</p>}
        <Button type="submit" size="lg" disabled={save.isPending || hasErrors}>
          <Save />
          {save.isPending ? "Saving..." : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
