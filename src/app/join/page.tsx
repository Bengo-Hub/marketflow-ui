"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { cleanReferralCode } from "@/lib/referrals";

/**
 * Two links open here and start SSO sign-up:
 * - a business invite from the platform owner (?invite=): the accounts site creates the account
 *   and an active organisation;
 * - a gift a friend link from another business (?ref=CV-...): the new organisation is recorded as
 *   invited by that business, and both get AI credits on its first payment.
 * The person comes back through the callback to onboarding, then the dashboard.
 */
function Join() {
  const params = useSearchParams();
  const started = useRef(false);
  const invite = params.get("invite") ?? "";
  const referralCode = cleanReferralCode(params.get("ref"));
  const usable = Boolean(invite || referralCode);
  useEffect(() => {
    if (started.current || !usable) return;
    started.current = true;
    void useAuthStore.getState().redirectToSSO(undefined, undefined, {
      signup: true,
      invite: invite || undefined,
      referralCode: referralCode || undefined,
    });
  }, [invite, referralCode, usable]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      {usable ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
          <p className="text-base font-medium">{invite ? "Opening your invitation..." : "Opening MarketFlow sign-up..."}</p>
          <p className="max-w-sm text-sm text-muted-foreground">You will create your account on the Codevertex accounts site, then come back here to set up your workspace.</p>
        </>
      ) : (
        <>
          <p className="text-base font-medium">This invitation link is incomplete.</p>
          <p className="max-w-sm text-sm text-muted-foreground">Open the link you were sent again, or ask for a new invitation.</p>
        </>
      )}
    </main>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <Join />
    </Suspense>
  );
}
