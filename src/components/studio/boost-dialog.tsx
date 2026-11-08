"use client";

import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CapsuleTabs, Field, ToneBadge } from "@/components/ui-kit";
import { useAdAccounts, useAdQuote, useBoost, useBoostAction, useLaunchBoost } from "@/hooks/use-ads";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { usePublishAccounts } from "@/hooks/use-publishing";
import { adsApi, metaBillingURL, STAGE_LABEL, type Objective } from "@/lib/api/ads";
import { apiErrorMessage } from "@/lib/api/errors";

const money = (n: number, cur: string) => `${cur} ${n.toLocaleString("en-KE")}`;

/**
 * Boost an approved video on the business's own Meta ad account. The budget is paid to Meta by
 * the business (Meta's own payment step, including M-Pesa on KES accounts); MarketFlow charges
 * only launch credits. The ad is created paused and goes live after Meta's review and once the
 * budget is in place.
 */
export function BoostDialog({
  open,
  onOpenChange,
  assetId,
  defaultText,
  defaultLink,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  assetId: string;
  defaultText?: string;
  /** The ad's lead page with UTM tags; the "Visit a link" objective starts with it. */
  defaultLink?: string;
}) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const accounts = useAdAccounts(open);
  const pages = usePublishAccounts(open);
  const fbPages = useMemo(() => (pages.data ?? []).filter((p) => p.platform === "facebook"), [pages.data]);
  const [account, setAccount] = useState("");
  const [page, setPage] = useState("");
  const [budget, setBudget] = useState(3000);
  const [days, setDays] = useState(7);
  const [objective, setObjective] = useState<Objective>("whatsapp");
  const [message, setMessage] = useState(defaultText ?? "");
  const [link, setLink] = useState(defaultLink ?? "");
  const [error, setError] = useState<string | null>(null);
  const [boostID, setBoostID] = useState<string | null>(null);

  const acct = account || accounts.data?.find((a) => a.active)?.connected_account_id || "";
  const pg = page || fbPages[0]?.id || "";
  const debBudget = useDebouncedValue(budget, 400);
  const quote = useAdQuote(acct, debBudget, days);
  const launch = useLaunchBoost();
  const boost = useBoost(boostID);
  const paid = useBoostAction(adsApi.paid, "Thanks, we will start once Meta confirms", "Could not update the boost");
  const qc = useQueryClient();
  const createKES = useMutation({
    mutationFn: () => adsApi.createKES({ page_connected_id: pg || undefined }),
    onSuccess: (a) => {
      setAccount(a.connected_account_id);
      void qc.invalidateQueries({ queryKey: ["ad-accounts"] });
    },
    onError: (e) => setError(apiErrorMessage(e, "Could not create the KES ad account")),
  });
  // M-Pesa on Meta is offered only on KES accounts.
  const hasKES = (accounts.data ?? []).some((a) => a.active && a.currency === "KES");

  const q = quote.data;
  const blocked = !q || (q.blockers?.length ?? 0) > 0;
  const submit = () => {
    setError(null);
    launch.mutate(
      { ad_account_connected_id: acct, budget, days, page_connected_id: pg, asset_id: assetId, objective, message: message.trim(), link: link || undefined },
      { onSuccess: (b) => setBoostID(b.id), onError: (e) => setError(apiErrorMessage(e, "Could not start the boost")) },
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Boost this video</DialogTitle>
          <DialogDescription>Runs on your own Meta ad account. You pay Meta for the ads; MarketFlow never handles that money.</DialogDescription>
        </DialogHeader>

        {boostID ? (
          <BoostProgress boost={boost.data} onPaid={() => paid.mutate(boostID)} paying={paid.isPending} />
        ) : accounts.isSuccess && accounts.data.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No Meta ad account is connected.{" "}
            <Link href={`/${orgSlug}/settings/integrations`} className="font-medium text-primary hover:underline">
              Connect Meta
            </Link>
          </p>
        ) : (
          <div className="space-y-4">
            <Field label="Ad account" htmlFor="boost-account">
              <select id="boost-account" className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" value={acct} onChange={(e) => setAccount(e.target.value)}>
                {(accounts.data ?? []).map((a) => (
                  <option key={a.connected_account_id} value={a.connected_account_id} disabled={!a.active}>
                    {a.name}{a.currency ? ` (${a.currency})` : ""}{a.problem ? `: ${a.problem}` : ""}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Runs as this Facebook Page" htmlFor="boost-page">
              <select id="boost-page" className="min-h-11 w-full rounded-lg border border-input bg-background px-3 text-sm" value={pg} onChange={(e) => setPage(e.target.value)}>
                {fbPages.map((p) => (
                  <option key={p.id} value={p.id}>{p.display_name}</option>
                ))}
              </select>
            </Field>
            <CapsuleTabs
              label="What the ad asks people to do"
              value={objective}
              onChange={setObjective}
              options={[
                { value: "whatsapp" as const, label: "Message on WhatsApp" },
                { value: "leads" as const, label: "Fill a form" },
                { value: "traffic" as const, label: "Visit a link" },
              ]}
            />
            {objective === "traffic" && (
              <Field label="Link" htmlFor="boost-link" hint={defaultLink && link === defaultLink ? "This ad's own lead page, tagged so you can see which leads it brings." : undefined}>
                <Input id="boost-link" type="url" placeholder="https://" value={link} onChange={(e) => setLink(e.target.value)} />
              </Field>
            )}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Total budget" htmlFor="boost-budget" hint={q ? q.currency : undefined}>
                <Input id="boost-budget" type="number" min={1} value={budget} onChange={(e) => setBudget(Math.max(0, Number(e.target.value)))} />
              </Field>
              <Field label="Days" htmlFor="boost-days">
                <Input id="boost-days" type="number" min={1} max={90} value={days} onChange={(e) => setDays(Math.min(90, Math.max(1, Number(e.target.value))))} />
              </Field>
            </div>
            <Field label="Ad text" htmlFor="boost-text">
              <Textarea id="boost-text" rows={3} maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} />
            </Field>

            {accounts.isSuccess && !hasKES && (
              <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-3 text-sm">
                <span className="flex-1">To pay Meta with M-Pesa you need a KES ad account.</span>
                <Button size="sm" variant="outline" disabled={createKES.isPending} onClick={() => createKES.mutate()}>
                  {createKES.isPending ? "Creating..." : "Create a KES ad account"}
                </Button>
              </div>
            )}
            {quote.isError && <p className="text-sm text-destructive">{apiErrorMessage(quote.error, "Could not check the ad account")}</p>}
            {q && (
              <div className="space-y-1 rounded-lg border border-border p-3 text-sm">
                <p>
                  Paid to Meta by you: <strong>{money(q.budget, q.currency)}</strong>
                  {q.funding === "card" && " (charged to your card as the ads run)"}
                </p>
                {q.funding === "prepaid" && <p className="text-muted-foreground">Your Meta balance covers it.</p>}
                {(q.funding === "needs_funds" || q.funding === "unknown") && (
                  <p className="text-muted-foreground">
                    {q.funding === "needs_funds" ? `Add ${money(q.shortfall, q.currency)} on Meta before it can start.` : "Add the budget on Meta before it can start."}
                  </p>
                )}
                <p>MarketFlow launch: <strong>{q.launch_credits === 0 ? "included in your plan" : `${q.launch_credits} AI credits`}</strong></p>
                {q.blockers?.map((b) => (
                  <p key={b} className="text-destructive">{b}</p>
                ))}
              </div>
            )}
            {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          </div>
        )}

        {!boostID && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={launch.isPending}>Cancel</Button>
            <Button onClick={submit} disabled={launch.isPending || blocked || !pg || !message.trim()}>
              {launch.isPending ? "Starting..." : "Confirm and launch"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}

function BoostProgress({ boost, onPaid, paying }: { boost?: Awaited<ReturnType<typeof adsApi.get>>; onPaid: () => void; paying: boolean }) {
  if (!boost) return <p className="text-sm text-muted-foreground">Starting...</p>;
  const stage = boost.launch?.stage ?? "campaign";
  const q = boost.quote;
  const needsFunds = q && (q.funding === "needs_funds" || q.funding === "unknown") && !boost.launch?.paid_confirmed;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ToneBadge tone={stage === "failed" ? "danger" : stage === "live" ? "success" : "info"}>{STAGE_LABEL[stage] ?? stage}</ToneBadge>
      </div>
      {boost.launch?.error && stage === "failed" && <p className="text-sm text-destructive">{boost.launch.error}</p>}
      {needsFunds && q && (
        <div className="space-y-2 rounded-lg border border-border p-3 text-sm">
          <p>Add {money(q.shortfall || q.budget, q.currency)} to your Meta ad account. On a KES account Meta offers M-Pesa.</p>
          <div className="flex flex-wrap gap-2">
            <a href={metaBillingURL(q.ad_account_id)} target="_blank" rel="noopener noreferrer" className={buttonVariants({ size: "sm" })}>
              Add funds on Meta
            </a>
            <Button size="sm" variant="outline" disabled={paying} onClick={onPaid}>I&apos;ve paid</Button>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground">You can close this; the boost keeps going and shows on its campaign page.</p>
    </div>
  );
}
