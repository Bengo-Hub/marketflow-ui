"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Compass, ExternalLink, Sparkles } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState, GlassPanel, PageHeader, ToneBadge } from "@/components/ui-kit";
import { apiError, marketingOsApi, type ResearchWinner } from "@/lib/api/marketing-os";

/** Drafts describe a winner by its shape only, so no competitor's words reach a new ad. */
function winnerDraft(w: ResearchWinner) {
  return `Write a short video ad for my business. A ${w.format.toLowerCase()} ad that ran ${w.total_days_shown} days is working in my market. Keep that kind of structure, change the angle for my customers, and answer one complaint from my list. Use only true facts from my brand context.`;
}

function complaintDraft(complaint: string) {
  return `Write a short video ad that answers this complaint customers have in my market: "${complaint}". Promise only what my brand context says is true.`;
}

function referenceDraft(notes: string) {
  return `Write a short video ad for my business. I saw an ad that works. My notes on it: ${notes}. Keep that kind of structure, change the angle for my customers, and use only true facts from my brand context.`;
}

function UseInAd({ orgSlug, brief }: { orgSlug: string; brief: string }) {
  return (
    <Link href={`/${orgSlug}/team?brief=${encodeURIComponent(brief)}`} className={buttonVariants({ variant: "ghost", size: "sm", className: "shrink-0" })}>
      <Sparkles /> Use in a new ad
    </Link>
  );
}

/**
 * Find, Flip, Fix in one place: what already sells in this market and what customers complain
 * about. Opening a draft costs nothing; the Marketing Manager quotes anything that does.
 */
export default function ResearchPage() {
  const params = useParams();
  const orgSlug = params?.orgSlug as string;
  const researchQ = useQuery({ queryKey: ["market-research", orgSlug], queryFn: marketingOsApi.research });
  const settingsQ = useQuery({ queryKey: ["os-settings", orgSlug], queryFn: marketingOsApi.settings });

  const contextHref = `/${orgSlug}/settings/marketing-context`;
  const failed = researchQ.error ?? settingsQ.error;
  if (failed) {
    return (
      <ErrorState
        message={apiError(failed, "Could not load your market research")}
        onRetry={() => {
          void researchQ.refetch();
          void settingsQ.refetch();
        }}
      />
    );
  }

  const loading = researchQ.isLoading || settingsQ.isLoading;
  const scanned = researchQ.data ?? [];
  const tracked = settingsQ.data?.competitors ?? [];
  const references = settingsQ.data?.reference_ads ?? [];
  const complaints = settingsQ.data?.customer_complaints ?? [];
  const waiting = tracked.filter((q) => !scanned.some((c) => c.query.toLowerCase() === q.toLowerCase()));

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Compass />}
        title="Market research"
        description="What already sells in your market and what customers complain about. Your team uses this when it writes your ads."
        actions={
          <Link href={contextHref} className={buttonVariants({ variant: "outline" })}>
            Edit your lists
          </Link>
        }
      />

      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-40 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      ) : (
        <>
          <GlassPanel title="Competitor ads" description="Each week we look for the ads your competitors have run longest. An ad that runs for months is usually paying for itself.">
            {scanned.length === 0 && waiting.length === 0 ? (
              <EmptyState
                icon={<Compass />}
                title="No competitors yet"
                description="Add up to 10 competitors and the weekly scan looks for their longest running ads."
                action={
                  <Link href={contextHref} className={buttonVariants()}>
                    Add competitors
                  </Link>
                }
              />
            ) : (
              <div className="space-y-5">
                {scanned.map((c) => (
                  <section key={c.query} className="space-y-2">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-sm font-semibold">{c.query}</h3>
                      {c.read_at && <p className="text-xs text-muted-foreground">Read {new Date(c.read_at).toLocaleDateString()}</p>}
                    </div>
                    {c.winners.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No ads found for this name. Try their website or Google advertiser id.</p>
                    ) : (
                      <ul className="divide-y divide-border">
                        {c.winners.map((w, i) => (
                          <li key={`${w.advertiser}-${i}`} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 flex-wrap items-center gap-2 text-sm">
                              <span className="font-medium">{w.advertiser}</span>
                              <ToneBadge>{w.format}</ToneBadge>
                              <span className="text-muted-foreground">{w.total_days_shown} days</span>
                              {w.still_running && <ToneBadge tone="success">Still running</ToneBadge>}
                              {w.link && (
                                <a href={w.link} target="_blank" rel="noopener noreferrer" aria-label={`See this ${w.advertiser} ad`} className="text-muted-foreground hover:text-primary">
                                  <ExternalLink className="size-4" />
                                </a>
                              )}
                            </div>
                            <UseInAd orgSlug={orgSlug} brief={winnerDraft(w)} />
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                ))}
                {waiting.length > 0 && <p className="text-sm text-muted-foreground">Waiting for the next weekly scan: {waiting.join(", ")}.</p>}
              </div>
            )}
          </GlassPanel>

          <GlassPanel title="Ads you saved" description="Ads you saw working, with your notes on why.">
            {references.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing saved yet. Paste ads you saw working on your{" "}
                <Link href={contextHref} className="underline underline-offset-2">
                  brand context
                </Link>{" "}
                page.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {references.map((r) => (
                  <li key={r.url} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 text-sm">
                      <a href={r.url} target="_blank" rel="noopener noreferrer" className="block truncate font-medium hover:text-primary">
                        {r.url}
                      </a>
                      {r.notes && <p className="text-muted-foreground">{r.notes}</p>}
                    </div>
                    {r.notes && <UseInAd orgSlug={orgSlug} brief={referenceDraft(r.notes)} />}
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>

          <GlassPanel title="What customers complain about" description="Your ads answer these only with things that are true of your business.">
            {complaints.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Nothing listed yet. Search public reviews or add your own on your{" "}
                <Link href={contextHref} className="underline underline-offset-2">
                  brand context
                </Link>{" "}
                page.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {complaints.map((c) => (
                  <li key={c} className="flex flex-col gap-2 py-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="min-w-0 text-sm">{c}</p>
                    <UseInAd orgSlug={orgSlug} brief={complaintDraft(c)} />
                  </li>
                ))}
              </ul>
            )}
          </GlassPanel>
        </>
      )}
    </div>
  );
}
