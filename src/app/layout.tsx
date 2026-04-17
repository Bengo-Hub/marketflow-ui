import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { UpdatePrompt } from "@/components/pwa/update-prompt";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MarketFlow",
  description: "AI-powered marketing automation — chatbots, ad campaigns, funnels, and nurture sequences on autopilot.",
  icons: { icon: "/favicon.svg", apple: "/icons/icon-192x192.png" },
  manifest: "/manifest.json",
  themeColor: "#f59e0b",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "MarketFlow" },
  viewport: { width: "device-width", initialScale: 1, maximumScale: 5 },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <Providers>{children}</Providers>
        <InstallPrompt />
        <UpdatePrompt />
      </body>
    </html>
  );
}
