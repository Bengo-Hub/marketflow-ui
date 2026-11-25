"use client";

import { Lock } from "lucide-react";
import { useAdminLocked } from "@/hooks/use-access";

/** Says why the controls on this screen are switched off. */
export function AdminNotice({ text = "You can view these settings. Only a MarketFlow admin can change them." }: { text?: string }) {
  return (
    <p role="note" className="mb-4 flex items-center gap-2 rounded-2xl border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
      <Lock className="size-4 shrink-0" aria-hidden />
      {text}
    </p>
  );
}

/**
 * Switches every control inside off for anyone but an admin, matching marketflow-api's admin-only
 * writes. A disabled fieldset does it natively, so the fields still read and links still work.
 */
export function AdminOnly({ children, notice }: { children: React.ReactNode; notice?: boolean }) {
  const locked = useAdminLocked();
  return (
    <>
      {locked && notice && <AdminNotice />}
      <fieldset disabled={locked} className="contents">{children}</fieldset>
    </>
  );
}
