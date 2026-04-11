"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
const AUTH_API_URL = process.env.NEXT_PUBLIC_AUTH_API_URL || "https://sso.codevertexitsolutions.com";

interface BrandData {
  name: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

const BrandContext = createContext<BrandData>({
  name: "MarketFlow",
});

function hexToHsl(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

async function fetchOrgBranding(slug: string): Promise<BrandData> {
  const res = await fetch(`${AUTH_API_URL}/api/v1/tenants/by-slug/${slug}`);
  if (!res.ok) return { name: "MarketFlow" };
  const data = await res.json();
  return {
    name: data.name || "MarketFlow",
    logoUrl: data.logo_url,
    primaryColor: data.brand_colors?.primary,
    secondaryColor: data.brand_colors?.secondary,
  };
}

export function BrandProvider({ children }: { children: ReactNode }) {
  const params = useParams();
  const orgSlug = params?.orgSlug as string | undefined;

  const { data: brand } = useQuery({
    queryKey: ["brand", orgSlug],
    queryFn: () => fetchOrgBranding(orgSlug || "codevertex"),
    enabled: !!orgSlug,
    staleTime: 24 * 60 * 60 * 1000, // 24h — branding rarely changes
    gcTime: 25 * 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });

  useEffect(() => {
    if (!brand) return;
    const root = document.documentElement;
    if (brand.primaryColor) {
      root.style.setProperty("--brand-primary", brand.primaryColor);
      root.style.setProperty("--brand-primary-hsl", hexToHsl(brand.primaryColor));
    }
    if (brand.secondaryColor) {
      root.style.setProperty("--brand-secondary", brand.secondaryColor);
      root.style.setProperty("--brand-secondary-hsl", hexToHsl(brand.secondaryColor));
    }
  }, [brand]);

  return (
    <BrandContext.Provider value={brand || { name: "MarketFlow" }}>
      {children}
    </BrandContext.Provider>
  );
}

export const useBrand = () => useContext(BrandContext);
