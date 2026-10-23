"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Mail, Phone, UserRound } from "lucide-react";
import { WhatsAppIcon } from "@/components/public-profile/whatsapp-icon";
import { ActivityTimeline } from "@/components/crm/activity-timeline";
import { CustomFieldsPanel } from "@/components/crm/custom-fields-panel";
import { CapsuleTabs, ErrorState, GlassPanel, ToneBadge, humanize } from "@/components/ui-kit";
import { useLead, useUpdateLead } from "@/hooks/use-leads";
import { LEAD_STATUSES, leadName } from "@/lib/api/leads";

const when = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium", timeStyle: "short" });

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{children}</span>
    </div>
  );
}

export default function LeadDetailPage() {
  const { orgSlug, id } = useParams<{ orgSlug: string; id: string }>();
  const lead = useLead(id);
  const update = useUpdateLead(id);
  const l = lead.data;
  const wa = l?.phone ? `https://wa.me/${l.phone.replace(/\D/g, "")}` : null;

  return (
    <div className="space-y-6">
      <Link href={`/${orgSlug}/leads`} className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" />
        All leads
      </Link>

      {lead.isError && <ErrorState message="Could not load this lead." onRetry={() => void lead.refetch()} />}
      {lead.isLoading && <div className="glass h-40 animate-pulse rounded-[1.25rem]" />}

      {l && (
        <>
          <div className="glass rounded-[1.25rem] p-5 sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <UserRound className="h-6 w-6" />
                </div>
                <div>
                  <h1 className="font-display text-2xl font-semibold tracking-tight">{leadName(l)}</h1>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <ToneBadge>{humanize(l.source)}</ToneBadge>
                    {l.lead_type === "recruit" && <ToneBadge tone="primary">Recruit</ToneBadge>}
                    <span className="text-xs text-muted-foreground">Received {when.format(new Date(l.created_at))}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground hover:bg-primary-dark">
                    <WhatsAppIcon className="h-4 w-4" />
                    WhatsApp
                  </a>
                )}
                {l.phone && (
                  <a href={`tel:${l.phone}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-sm font-medium hover:bg-muted">
                    <Phone className="h-4 w-4" />
                    Call
                  </a>
                )}
                {l.email && (
                  <a href={`mailto:${l.email}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-background/70 px-4 text-sm font-medium hover:bg-muted">
                    <Mail className="h-4 w-4" />
                    Email
                  </a>
                )}
              </div>
            </div>
            <div className="mt-5">
              <p className="mb-2 text-sm font-medium">Status</p>
              <CapsuleTabs
                label="Lead status"
                value={l.status}
                onChange={(s) => s !== l.status && update.mutate({ status: s })}
                options={LEAD_STATUSES.map((s) => ({ value: s, label: humanize(s) }))}
              />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div className="space-y-6">
              <GlassPanel title="Details">
                <div className="divide-y divide-border">
                  <Row label="Email">{l.email || "Not given"}</Row>
                  <Row label="Phone">{l.phone || "Not given"}</Row>
                  <Row label="Score">{l.score}</Row>
                  {l.interest && <Row label="Interested in">{l.interest}</Row>}
                  {(l.utm_source || l.utm_medium || l.utm_campaign) && (
                    <Row label="Ad tracking">{[l.utm_source, l.utm_medium, l.utm_campaign].filter(Boolean).join(" / ")}</Row>
                  )}
                </div>
              </GlassPanel>
              {l.qualification_answers && Object.keys(l.qualification_answers).length > 0 && (
                <GlassPanel title="Their answers">
                  <div className="divide-y divide-border">
                    {Object.entries(l.qualification_answers).map(([k, v]) => (
                      <Row key={k} label={humanize(k)}>
                        {typeof v === "string" || typeof v === "number" ? String(v) : JSON.stringify(v)}
                      </Row>
                    ))}
                  </div>
                </GlassPanel>
              )}
              <CustomFieldsPanel entity="lead" id={id} />
            </div>
            <ActivityTimeline entity="lead" id={id} />
          </div>
        </>
      )}

    </div>
  );
}
