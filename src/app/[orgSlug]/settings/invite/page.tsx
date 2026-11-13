"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, Copy, Gift, Mail, MessageCircle } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { ErrorState, GlassPanel, PageHeader, StatusBadge } from "@/components/ui-kit";
import { UsageCard } from "@/components/billing/usage-card";
import { inviteLink, inviteMessage, referralsApi, rewardValue, whatsAppShare } from "@/lib/referrals";

const dateFmt = new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" });

/**
 * Invite and earn (owner, 2026-11-12): every business has a link. When a business that signed up
 * through it makes its first payment, both get AI credits, for up to a set number of friends.
 * The terms shown are the live ones from subscriptions-api; nothing here counts down or invents
 * numbers.
 */
export default function InvitePage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const summary = useQuery({ queryKey: ["referrals", orgSlug], queryFn: referralsApi.summary, retry: 1 });
  const allowance = useQuery({ queryKey: ["chat-allowance", orgSlug], queryFn: referralsApi.chatAllowance, retry: 1 });
  const [copied, setCopied] = useState(false);

  if (summary.isError) {
    return <ErrorState message="Could not load your invitations." onRetry={() => void summary.refetch()} />;
  }
  const s = summary.data;
  const link = s ? inviteLink(s.referral_code) : "";
  const message = s ? inviteMessage("", link, s.reward_credits) : "";
  const value = s ? rewardValue(s.reward_credits, s.credit_value_kes, allowance.data?.kes_per_usd) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-6">
      <PageHeader
        title="Invite and earn"
        icon={<Gift />}
        description="Share MarketFlow with another business. When they make their first payment, you both get free AI credits."
      />

      <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
        <GlassPanel title="Your invitation link">
          {!s ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="flex flex-col gap-4">
              <p className="text-sm">
                You and your friend each get <strong>{s.reward_credits} AI credits</strong>
                {value && (
                  <span className="text-muted-foreground">
                    {" "}(about {value.kes}{value.usd ? `, ${value.usd}` : ""} at the smallest bundle price)
                  </span>
                )}
                {" "}when they make their first payment. You can be rewarded for up to {s.invite_cap} businesses.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  readOnly
                  value={link}
                  aria-label="Your invitation link"
                  className="min-w-0 flex-1 rounded-lg border bg-muted/40 px-3 py-2 text-sm"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button type="button" variant="outline" onClick={() => void copy()}>
                  {copied ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
                  {copied ? "Copied" : "Copy link"}
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href={whatsAppShare(message)} target="_blank" rel="noopener noreferrer" className={buttonVariants()}>
                  <MessageCircle className="h-4 w-4" aria-hidden /> Share on WhatsApp
                </a>
                <a
                  href={`mailto:?subject=${encodeURIComponent("Try MarketFlow with me")}&body=${encodeURIComponent(message)}`}
                  className={buttonVariants({ variant: "outline" })}
                >
                  <Mail className="h-4 w-4" aria-hidden /> Email
                </a>
              </div>
              <p className="text-sm text-muted-foreground">
                {s.rewards_left > 0
                  ? `${s.rewards_used} of ${s.invite_cap} rewards earned so far (${s.credits_earned} credits). ${s.rewards_left} left.`
                  : `You have earned all ${s.invite_cap} rewards (${s.credits_earned} credits). Thank you for sharing MarketFlow.`}
              </p>
            </div>
          )}
        </GlassPanel>

        <UsageCard />
      </div>

      <GlassPanel title="Businesses you invited" description="A reward is paid once, after the business's first payment.">
        {!s ? (
          <p className="text-sm text-muted-foreground">Loading...</p>
        ) : s.friends.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nobody has signed up with your link yet.</p>
        ) : (
          <ul className="divide-y">
            {s.friends.map((f, i) => (
              <li key={`${f.name}-${f.joined_at}-${i}`} className="flex items-center justify-between gap-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="truncate font-medium">{f.name || "A business"}</p>
                  <p className="text-xs text-muted-foreground">Joined {dateFmt.format(new Date(f.joined_at))}</p>
                </div>
                <StatusBadge status={f.rewarded ? "active" : "pending"} label={f.rewarded ? "Rewarded" : "Waiting for first payment"} />
              </li>
            ))}
          </ul>
        )}
      </GlassPanel>
    </div>
  );
}
