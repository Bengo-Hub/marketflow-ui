"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { ListChecks } from "lucide-react";
import { AdAccountChoiceCard } from "@/components/ads/ad-account-choice";
import { AccountChecklist } from "@/components/ads/account-checklist";
import { EmptyState, ErrorState, PageHeader } from "@/components/ui-kit";
import { adsSetupApi } from "@/lib/api/ads-setup";

/** Item 65 (owner, 2026-11-24): what each connected ad account still needs, in plain words. */
export default function AdsSetupPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const q = useQuery({ queryKey: ["ads-setup-accounts", orgSlug], queryFn: adsSetupApi.accounts, staleTime: 60_000 });
  const integrations = <Link className="underline" href={`/${orgSlug}/settings/integrations`}>Open Integrations</Link>;

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ListChecks />}
        title="Ads setup"
        description="What each of your ad accounts needs before ads work well. Start at the top: press the button where there is one, or follow the numbered steps. You see each change before it happens."
      />
      <AdAccountChoiceCard />
      {q.isLoading &&<div className="glass h-64 animate-pulse rounded-[1.25rem]" aria-busy />}
      {q.isError && <ErrorState message="Could not load your ad accounts." onRetry={() => void q.refetch()} />}
      {q.data?.length === 0 && (
        <EmptyState icon={<ListChecks />} title="No ad account connected" description="Connect Google Ads, Meta or TikTok first." action={integrations} />
      )}
      {q.data?.map((a) =>
        a.status === "active" ? (
          <AccountChecklist key={a.connected_account_id} account={a} />
        ) : (
          <p key={a.connected_account_id} className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
            {a.name} needs connecting again. {integrations}
          </p>
        ),
      )}
    </div>
  );
}
