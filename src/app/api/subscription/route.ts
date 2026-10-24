import { NextRequest, NextResponse } from 'next/server';

// Server-to-server call — prefer the in-cluster Service DNS so this never
// leaves the cluster and round-trips through the public ingress/Cloudflare.
const PRICING_API =
  process.env.SUBSCRIPTION_BASE_URL ||
  process.env.NEXT_PUBLIC_SUBSCRIPTIONS_API_URL ||
  'https://pricingapi.codevertexafrica.com';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Subscription lookup for the signed-in user's tenant.
 * GET /api/subscription?tenantId=<uuid>  (Authorization: Bearer <access token>)
 *
 * The caller's own token is forwarded, never the platform service key: subscriptions-api
 * then answers only for the token's tenant (or a platform owner), so this route cannot be
 * used to read another tenant's plan by guessing its id.
 */
export async function GET(req: NextRequest) {
  const tenantId = req.nextUrl.searchParams.get('tenantId');
  if (!tenantId || !UUID.test(tenantId)) {
    return NextResponse.json({ error: 'tenantId required' }, { status: 400 });
  }
  const auth = req.headers.get('authorization');
  if (!auth || !/^Bearer\s+\S+$/i.test(auth)) {
    return NextResponse.json({ error: 'sign in required' }, { status: 401 });
  }

  try {
    const upstream = await fetch(`${PRICING_API}/api/v1/tenants/${tenantId}/subscription`, {
      headers: { Authorization: auth },
      // Per-user answer: never share a cached response between callers.
      cache: 'no-store',
    });

    if (!upstream.ok) {
      return NextResponse.json(null, { status: upstream.status });
    }

    const data = await upstream.json();
    return NextResponse.json(data, { headers: { 'Cache-Control': 'private, max-age=60' } });
  } catch {
    return NextResponse.json(null, { status: 503 });
  }
}
