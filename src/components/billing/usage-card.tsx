"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { MessageSquare, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { useCredits } from "@/hooks/use-billing";
import { referralsApi, untilReset } from "@/lib/referrals";
import { cn } from "@/lib/utils";

/**
 * Today's free chat turns and the AI credit balance (owner, 2026-11-12, after Claude's usage page):
 * what is used, what is left, when the free turns reset, and a way to buy more. Chat past the free
 * turns and every other AI job is paid from credits; no plan includes credits.
 */
export function UsageCard({ className }: { className?: string }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const allowance = useQuery({ queryKey: ["chat-allowance", orgSlug], queryFn: referralsApi.chatAllowance, refetchInterval: 60_000, retry: 1 });
  const credits = useCredits();
  const ai = credits.data?.find((s) => s.service === "ai_credits");
  const a = allowance.data;
  const used = a ? Math.min(a.turns_used_today, a.free_turns_daily) : 0;
  const pct = a && a.free_turns_daily > 0 ? Math.round((used / a.free_turns_daily) * 100) : 0;

  return (
    <section aria-label="Your usage today" className={cn("rounded-2xl border bg-card p-4 shadow-sm", className)}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <MessageSquare className="h-4 w-4 text-primary" aria-hidden />
        Free chat today
      </div>
      {a ? (
        <>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuemin={0} aria-valuemax={a.free_turns_daily} aria-valuenow={used} aria-label="Free chat turns used today">
            <div className={cn("h-full rounded-full", pct >= 90 ? "bg-amber-500" : "bg-primary")} style={{ width: `${pct}%` }} />
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {a.free_turns_left > 0
              ? `${a.free_turns_left} of ${a.free_turns_daily} free turns left. They reset ${untilReset(a.resets_at)} (03:00 Nairobi time).`
              : `Today's ${a.free_turns_daily} free turns are used. Chat now costs 1 credit for every ${a.turns_per_credit} turns, until the reset ${untilReset(a.resets_at)}.`}
          </p>
        </>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">{allowance.isError ? "Could not load today's chat use." : "Loading..."}</p>
      )}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-3">
        <div className="flex items-center gap-2 text-sm">
          <Zap className="h-4 w-4 text-primary" aria-hidden />
          <span>
            AI credits:{" "}
            <strong>{!ai ? "..." : ai.unlimited || ai.exempt ? "Unlimited" : ai.bundle_balance.toLocaleString("en-KE")}</strong>
          </span>
        </div>
        <Link href={`/${orgSlug}/settings/billing`} className={buttonVariants({ size: "sm", variant: "outline" })}>
          Buy more
        </Link>
      </div>
    </section>
  );
}
