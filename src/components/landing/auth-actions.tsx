"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth-store";
import { cn } from "@/lib/utils";

/** Signed-in visitors go straight to their workspace. */
export function AuthRedirect() {
  const { status, user, initialize } = useAuthStore();
  const router = useRouter();
  useEffect(() => {
    if (status === "idle") initialize();
  }, [status, initialize]);
  useEffect(() => {
    if (status === "authenticated" && user?.tenantSlug) router.replace(`/${user.tenantSlug}/dashboard`);
  }, [status, user, router]);
  return null;
}

/**
 * Starts the SSO flow on the accounts site's sign-up page (prompt=create), so a new business
 * creates its account and organisation and comes back to MarketFlow's callback, then onboarding.
 * The old link went to accounts/register, a page that does not exist, with no way back.
 */
export function SignUpButton({ className, children = "Create your workspace" }: { className?: string; children?: ReactNode }) {
  return (
    <button type="button" onClick={() => useAuthStore.getState().redirectToSSO(undefined, undefined, { signup: true })} className={className}>
      {children}
    </button>
  );
}

export function SignInButton({ className, children = "Sign in" }: { className?: string; children?: ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => useAuthStore.getState().redirectToSSO(window.location.href)}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-foreground transition-colors hover:bg-accent",
        className,
      )}
    >
      {children}
    </button>
  );
}
