import { type NextRequest, NextResponse } from 'next/server';
import { DEFAULT_BRAND_COLOR, normalizeHex } from '@/lib/brand';

const AUTH_API_BASE =
  process.env.NEXT_PUBLIC_SSO_URL ||
  process.env.NEXT_PUBLIC_AUTH_API_URL ||
  'https://sso.codevertexafrica.com';

// Light app background, matching --background in globals.css.
const APP_BG = '#fcf8fc';

interface TenantResponse {
  name?: string;
  logo_url?: string;
  brand_colors?: { primary?: string; secondary?: string };
  metadata?: Record<string, string | undefined>;
}

async function fetchTenant(slug: string): Promise<TenantResponse | null> {
  try {
    const res = await fetch(
      `${AUTH_API_BASE}/api/v1/tenants/by-slug/${encodeURIComponent(slug)}`,
      { next: { revalidate: 3600 } },
    );
    if (!res.ok) return null;
    return res.json() as Promise<TenantResponse>;
  } catch {
    return null;
  }
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ orgSlug: string }> },
) {
  const { orgSlug } = await params;
  const tenant = await fetchTenant(orgSlug);

  const name = tenant?.name ?? 'Codevertex';
  const primaryColor =
    normalizeHex(tenant?.brand_colors?.primary) ??
    normalizeHex(tenant?.metadata?.primary_color) ??
    DEFAULT_BRAND_COLOR;
  const logoUrl = tenant?.logo_url ?? (tenant?.metadata?.logo_url as string | undefined);

  const icons = logoUrl
    ? [
        { src: logoUrl, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: logoUrl, sizes: '512x512', type: 'image/png', purpose: 'any' },
      ]
    : [
        { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: '/icons/maskable-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
        { src: '/icons/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ];

  const manifest = {
    name: `${name} MarketFlow`,
    short_name: name,
    description: 'Leads, follow-ups and campaigns for your business.',
    start_url: `/${orgSlug}/`,
    scope: `/${orgSlug}/`,
    display: 'standalone',
    orientation: 'portrait-primary',
    background_color: APP_BG,
    theme_color: primaryColor,
    categories: ['business', 'marketing', 'productivity'],
    lang: 'en',
    icons,
    shortcuts: [
      {
        name: 'Campaigns',
        short_name: 'Campaigns',
        description: 'View and manage campaigns',
        url: `/${orgSlug}/campaigns`,
        icons: [{ src: logoUrl ?? '/icons/icon-192x192.png', sizes: '192x192' }],
      },
    ],
  };

  return NextResponse.json(manifest, {
    headers: {
      'Content-Type': 'application/manifest+json',
      'Cache-Control': 'public, max-age=3600, stale-while-revalidate=86400',
    },
  });
}
