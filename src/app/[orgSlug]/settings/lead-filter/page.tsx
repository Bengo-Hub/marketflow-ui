"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { Filter, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ErrorState, Field, GlassPanel, PageHeader } from "@/components/ui-kit";
import { useUpdateTenantProfile } from "@/hooks/use-tenant-profile";
import { tenantProfileApi } from "@/lib/api/tenant-profile";
import {
  LEAD_FILTER_KINDS,
  leadFilterPatch,
  leadFilterProblems,
  leadFilterText,
  parseLeadFilterWords,
  wordsAlreadyCovered,
  type LeadFilterKind,
  type LeadFilterResponse,
  type LeadFilterWords,
} from "@/lib/leads/lead-filter-settings";

/**
 * Item 61: which form submissions are not leads. MarketFlow's own words are shown read only; the
 * owner or an admin adds the business's own words, which are checked on top of them.
 */
export default function LeadFilterSettingsPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const q = useQuery({ queryKey: ["lead-filter", orgSlug], queryFn: tenantProfileApi.leadFilter, staleTime: 30_000 });
  if (q.error) return <ErrorState message="Could not load the lead filter." onRetry={() => void q.refetch()} />;
  if (q.isLoading || !q.data) return <div className="glass mx-auto h-64 max-w-3xl animate-pulse rounded-[1.25rem]" aria-busy />;
  return <LeadFilterForm key={q.dataUpdatedAt} data={q.data} />;
}

function LeadFilterForm({ data }: { data: LeadFilterResponse }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const save = useUpdateTenantProfile();
  const [text, setText] = useState<Record<LeadFilterKind, string>>({
    attachment: leadFilterText(data.tenant.attachment),
    job: leadFilterText(data.tenant.job),
    service_offer: leadFilterText(data.tenant.service_offer),
  });
  const words: LeadFilterWords = {
    attachment: parseLeadFilterWords(text.attachment),
    job: parseLeadFilterWords(text.job),
    service_offer: parseLeadFilterWords(text.service_offer),
  };
  const problems = leadFilterProblems(words);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (problems.length > 0 || !data.can_edit) return;
    save.mutate(
      { metadata: { lead_filter: leadFilterPatch(words) } },
      { onSuccess: () => void qc.invalidateQueries({ queryKey: ["lead-filter", orgSlug] }) },
    );
  };

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-3xl space-y-6" noValidate>
      <PageHeader
        icon={<Filter />}
        title="Lead filter"
        description="A lead is someone interested in what you sell. Form messages asking for attachment or a job, or selling services to you, are not saved as leads, followed up or counted."
      />

      {!data.can_edit && (
        <p className="rounded-2xl border border-border bg-background/60 p-4 text-sm text-muted-foreground">
          Only the account owner or an admin can change these words.
        </p>
      )}

      {LEAD_FILTER_KINDS.map(({ kind, title, hint, example }) => {
        const covered = wordsAlreadyCovered(words[kind], data.platform[kind] ?? []);
        return (
          <GlassPanel key={kind} title={title} description={hint}>
            <div className="space-y-4 px-5 pb-5 pt-3">
              <div>
                <p className="mb-2 text-sm font-medium">MarketFlow already looks for</p>
                <ul className="flex flex-wrap gap-1.5" aria-label={`${title}: MarketFlow's words`}>
                  {(data.platform[kind] ?? []).map((w) => (
                    <li key={w} className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs text-muted-foreground">
                      {w.trim()}
                    </li>
                  ))}
                </ul>
              </div>
              <Field
                label="Your own words"
                htmlFor={`lf-${kind}`}
                hint={
                  covered.length > 0
                    ? `Already on MarketFlow's list: ${covered.join(", ")}.`
                    : "One word or phrase per line. A message that contains any of them is not a lead."
                }
              >
                <Textarea
                  id={`lf-${kind}`}
                  rows={4}
                  value={text[kind]}
                  disabled={!data.can_edit}
                  placeholder={`For example: ${example}`}
                  onChange={(e) => setText((cur) => ({ ...cur, [kind]: e.target.value }))}
                />
              </Field>
            </div>
          </GlassPanel>
        );
      })}

      {problems.length > 0 && (
        <ul className="list-disc pl-5 text-sm text-destructive" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      {data.can_edit && (
        <div className="flex justify-end">
          <Button type="submit" disabled={save.isPending || problems.length > 0}>
            <Save className="h-4 w-4" />
            {save.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      )}
    </form>
  );
}
