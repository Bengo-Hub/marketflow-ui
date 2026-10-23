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
