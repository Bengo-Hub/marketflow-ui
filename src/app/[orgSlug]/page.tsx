import { redirect } from "next/navigation";

/**
 * A bare tenant link (marketflow.codevertexafrica.com/hadia) opens that tenant's dashboard, as the
 * other apps do for /{tenantSlug}. Signing in and tenant access stay with the [orgSlug] layout: a
 * signed-out visitor goes to sign-in and comes back to this link, which then lands on the dashboard.
 */
export default async function TenantHome({ params }: { params: Promise<{ orgSlug: string }> }) {
  const { orgSlug } = await params;
  redirect(`/${encodeURIComponent(orgSlug)}/dashboard`);
}
