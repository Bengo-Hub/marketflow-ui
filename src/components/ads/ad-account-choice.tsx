"use client";

import { useParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { GlassPanel, ToneBadge } from "@/components/ui-kit";
import { adAccountsApi, groupAdAccounts, type AdAccountChoice } from "@/lib/api/ad-accounts";
import { apiErrorMessage } from "@/lib/api/errors";
import { PLATFORM_LABEL } from "@/lib/ads/run-ads";

/** Which connected ad account each platform's ads run on (owner, 2026-11-25). */
export function AdAccountChoiceCard() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["ad-account-choice", orgSlug], queryFn: adAccountsApi.list, staleTime: 60_000, retry: 1 });
  const set = useMutation({
    mutationFn: ({ id, ...b }: { id: string; default?: boolean; hidden?: boolean }) => adAccountsApi.set(id, b),
    onSuccess: (d) => {
      qc.setQueryData(["ad-account-choice", orgSlug], d);
      for (const k of ["ads-setup-accounts", "ad-accounts", "run-ads-plan"]) void qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e) => toast.error(apiErrorMessage(e, "Could not change the ad account")),
  });
  if (q.isError) return <p className="text-sm text-destructive">{apiErrorMessage(q.error, "Could not load your ad account choices.")}</p>;
  if (!q.data || q.data.data.length === 0) return null;
  const canEdit = q.data.can_edit && !set.isPending;

  return (
    <GlassPanel
      title="Ad accounts in use"
      description="Boost, Run ads, WhatsApp and this page use the same account for each platform. Your choice stays when you reconnect."
    >
      <div className="space-y-4 px-5 pb-5 pt-3">
        {groupAdAccounts(q.data.data).map(([platform, list]) => (
          <section key={platform} aria-label={PLATFORM_LABEL[platform] ?? platform} className="space-y-2">
            <h3 className="text-sm font-semibold">{PLATFORM_LABEL[platform] ?? platform}</h3>
            <ul className="space-y-2">
              {list.map((a) => (
                <li key={a.connected_account_id} className="flex flex-wrap items-center gap-2 rounded-xl border border-border p-3 text-sm">
                  <span className={`min-w-0 flex-1 ${a.hidden ? "text-muted-foreground" : ""}`}>
                    <span className="block font-medium">{a.name}{a.currency ? ` (${a.currency})` : ""}</span>
                    <span className="block text-xs text-muted-foreground">{a.external_id}{a.business ? `, ${a.business}` : ""}</span>
                  </span>
                  <AccountBadges a={a} />
                  {!a.chosen && (
                    <Button size="sm" variant="outline" disabled={!canEdit} onClick={() => set.mutate({ id: a.connected_account_id, default: true })}>
                      Use this account
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" disabled={!canEdit} onClick={() => set.mutate({ id: a.connected_account_id, hidden: !a.hidden })}>
                    {a.hidden ? "Show" : "Hide"}
                  </Button>
                </li>
              ))}
            </ul>
            {list.every((a) => !a.in_use) && <p className="text-xs text-destructive">Every account is hidden, so no ads can run on this platform.</p>}
          </section>
        ))}
        <p className="text-xs text-muted-foreground">
          Until you choose one, accounts in a business portfolio come before personal accounts. Hiding an account does not disconnect it.
          {!q.data.can_edit && " Only the account owner or an admin can change this."}
        </p>
      </div>
    </GlassPanel>
  );
}

function AccountBadges({ a }: { a: AdAccountChoice }) {
  return (
    <>
      {a.in_use && <ToneBadge tone="success">{a.chosen ? "Your choice" : "In use"}</ToneBadge>}
      {a.hidden && <ToneBadge tone="neutral">Hidden</ToneBadge>}
      {a.owner === "personal" && <ToneBadge tone="warning">Personal account</ToneBadge>}
      {a.owner === "portfolio" && <ToneBadge tone="info">Business portfolio</ToneBadge>}
    </>
  );
}
