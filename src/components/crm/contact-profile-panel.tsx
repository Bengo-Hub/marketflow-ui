"use client";

import { GlassPanel, ToneBadge, humanize } from "@/components/ui-kit";

/** The profile the contact enricher keeps in metadata.enrichment (marketflow-api modules/enrichment). */
export interface ContactProfile {
  refreshed_at?: string;
  segment?: string;
  origin?: { lead_source?: string; utm_source?: string; utm_campaign?: string; interest?: string; first_seen_at?: string };
  engagement?: { activities_90d?: number; last_activity_at?: string; last_activity_type?: string };
  purchases?: { orders?: number; payments?: number; last_purchase_at?: string };
  deals?: { open?: number; won?: number };
  email?: { kind?: string; domain?: string };
  company?: { name?: string; industry?: string; website?: string; summary?: string; suggested_account_id?: string };
}

const day = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });
const fmt = (s?: string) => (s ? day.format(new Date(s)) : "");

/** Reads the stored profile; anything that is not an object gives undefined. */
export function contactProfile(metadata?: Record<string, unknown>): ContactProfile | undefined {
  const p = metadata?.enrichment;
  return p && typeof p === "object" ? (p as ContactProfile) : undefined;
}

function Row({ label, value }: { label: string; value?: string | number }) {
  if (value === undefined || value === "") return null;
  return (
    <div className="flex justify-between gap-4 py-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

export function ContactProfilePanel({ metadata }: { metadata?: Record<string, unknown> }) {
  const p = contactProfile(metadata);
  if (!p) return null;
  const c = p.company;
  return (
    <GlassPanel title="Profile" description={p.refreshed_at ? `From your own records, updated ${fmt(p.refreshed_at)}` : "From your own records"}>
      {p.segment && <ToneBadge tone="info">{humanize(p.segment)}</ToneBadge>}
      <dl className="mt-2 divide-y divide-border text-sm">
        <Row label="Came in through" value={p.origin?.lead_source ? humanize(p.origin.lead_source) : undefined} />
        <Row label="Campaign" value={p.origin?.utm_campaign} />
        <Row label="Interested in" value={p.origin?.interest} />
        <Row label="First seen" value={fmt(p.origin?.first_seen_at)} />
        <Row label="Orders" value={p.purchases?.orders || undefined} />
        <Row label="Payments" value={p.purchases?.payments || undefined} />
        <Row label="Last purchase" value={fmt(p.purchases?.last_purchase_at)} />
        <Row label="Contact in the last 90 days" value={p.engagement?.activities_90d ?? 0} />
        <Row label="Last contact" value={p.engagement?.last_activity_at ? `${fmt(p.engagement.last_activity_at)} (${humanize(p.engagement.last_activity_type ?? "")})` : undefined} />
        <Row label="Email" value={p.email?.kind === "organisation" ? `Work address (${p.email.domain})` : p.email?.kind === "free" ? "Personal address" : undefined} />
        <Row label={c?.suggested_account_id ? "Company (suggested from email)" : "Company"} value={c?.name} />
        <Row label="Industry" value={c?.industry} />
      </dl>
      {c?.summary && <p className="mt-3 text-sm text-muted-foreground">{c.summary}</p>}
    </GlassPanel>
  );
}
