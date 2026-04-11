"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { ReactNode, useState } from "react";
import { BrandProvider } from "@/contexts/BrandContext";
import { TooltipProvider } from "@/components/ui/tooltip";

// TanStack Query cache TTLs (matching TruLoad pattern)
const STALE_TIMES = {
  OPERATIONAL: 30 * 1000,     // 30s — leads, contacts (changes frequently)
  MODERATE: 60 * 1000,        // 1min — analytics
  SEMI_STATIC: 5 * 60 * 1000, // 5min — KB entries, provider settings
  STATIC: 24 * 60 * 60 * 1000, // 24h — branding, tenant profile
};

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
