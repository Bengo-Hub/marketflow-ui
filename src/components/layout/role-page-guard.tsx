"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState, GlassPanel } from "@/components/ui-kit";
import { useMyAccess } from "@/hooks/use-access";
import { APP_REVIEWER, isRestricted, pageAllowed, type MyAccess } from "@/lib/access/role-access";
import { useAuthStore } from "@/store/auth-store";

/** The SSO role that makes someone the app reviewer (marketflow-api maps it to app_reviewer). */
const SSO_REVIEWER_ROLE = "marketflow_reviewer";
const REVIEWER_ACCESS: MyAccess = { role: APP_REVIEWER, roles: [APP_REVIEWER], restricted: true, platform_owner: false };

/**
 * Keeps a restricted role (the Meta App Review account) to its pages. Opening any other page by
 * URL shows a plain "not available" state instead of the page's refused API calls.
 */
export function RolePageGuard({ children }: { children: React.ReactNode }) {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const pathname = usePathname() ?? "";
  const { data: access, isLoading } = useMyAccess();
  const ssoReviewer = useAuthStore((s) => s.user?.roles?.includes(SSO_REVIEWER_ROLE) ?? false);
  const base = `/${orgSlug}`;
  const path = pathname.startsWith(base) ? pathname.slice(base.length) : pathname;

  // A reviewer account (by its sign-in roles) waits for its MarketFlow role before a page it
  // could not open renders, so it never sees a burst of refused calls. Everyone else renders at once.
  if (ssoReviewer && isLoading && !pageAllowed(path, REVIEWER_ACCESS)) {
    return <div className="h-48 animate-pulse rounded-[1.25rem] bg-muted" aria-hidden />;
  }
  if (!isRestricted(access) || pageAllowed(path, access)) return <>{children}</>;
  return (
    <GlassPanel>
      <EmptyState
        icon={<Lock />}
        title="Not available for this account"
        description="This account is set up for the Meta app review: Dashboard, Studio, Leads, Inbox, Campaigns and Integrations."
        action={
          <Link href={`${base}/dashboard`} className={buttonVariants({ variant: "outline" })}>
            Go to the dashboard
          </Link>
        }
      />
    </GlassPanel>
  );
}
