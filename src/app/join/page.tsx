"use client";

import { Suspense, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

/**
 * A business invite link (auth-api business invites) opens here: it starts SSO sign-up with the
 * invite, the accounts site creates the account and an active organisation, and the person comes
 * back through the callback to onboarding, then the dashboard.
 */
function Join() {
  const params = useSearchParams();
  const started = useRef(false);
  const invite = params.get("invite") ?? "";
  useEffect(() => {
    if (started.current || !invite) return;
    started.current = true;
    void useAuthStore.getState().redirectToSSO(undefined, undefined, { signup: true, invite });
  }, [invite]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-4 text-center">
      {invite ? (
        <>
          <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden />
          <p className="text-base font-medium">Opening your invitation...</p>
          <p className="max-w-sm text-sm text-muted-foreground">You will create your account on the Codevertex accounts site, then come back here to set up your workspace.</p>
        </>
      ) : (
        <>
          <p className="text-base font-medium">This invitation link is incomplete.</p>
          <p className="max-w-sm text-sm text-muted-foreground">Open the link from your invitation email again, or ask for a new invitation.</p>
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
