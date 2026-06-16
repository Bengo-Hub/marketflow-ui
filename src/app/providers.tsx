"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { OfflineBar } from "@bengo-hub/shared-ui-lib/offline";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ReactNode, useEffect, useState } from "react";
import { BrandProvider } from "@/contexts/BrandContext";
import { TooltipProvider } from "@/components/ui/tooltip";
import { attachOutletIdGetter } from "@/lib/api/client";
import { useOutletFilterStore } from "@/store/outlet-filter";

// TanStack Query cache TTLs (matching TruLoad pattern)
const STALE_TIMES = {
  OPERATIONAL: 30 * 1000,     // 30s — leads, contacts (changes frequently)
  MODERATE: 60 * 1000,        // 1min — analytics
  SEMI_STATIC: 5 * 60 * 1000, // 5min — KB entries, provider settings
  STATIC: 24 * 60 * 60 * 1000, // 24h — branding, tenant profile
};

/** One-time outlet rehydration + getter registration. */
function OutletInit() {
  useEffect(() => {
    // Register getter so API interceptors always send X-Outlet-ID
    attachOutletIdGetter(() => useOutletFilterStore.getState().outletIdHeader());

    // Rehydrate from localStorage on page refresh
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('marketflow-selected-outlet-id');
      if (stored && !useOutletFilterStore.getState().selectedOutlet) {
        useOutletFilterStore.getState().selectOutlet({ id: stored, code: '', name: '' });
      }
    }
  }, []);
  return null;
}

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: STALE_TIMES.SEMI_STATIC,
            gcTime: 15 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnMount: true,
            retry: 2,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="system"
        enableSystem
        disableTransitionOnChange
      >
        <BrandProvider>
          <TooltipProvider>
            <OutletInit />
            <OfflineBar availableOffline={["View cached data"]} disabledOffline={["Edits", "Campaigns"]} />
            {children}
          </TooltipProvider>
        </BrandProvider>
      </ThemeProvider>
      <Toaster position="top-right" richColors />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}

export { STALE_TIMES };
