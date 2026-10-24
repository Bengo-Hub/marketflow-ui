import type { Metadata, Viewport } from "next";
import { DM_Sans, Outfit } from "next/font/google";
import "@bengo-hub/shared-ui-lib/contact/style.css";
import "./globals.css";
import { Providers } from "./providers";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { UpdatePrompt } from "@/components/pwa/update-prompt";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-outfit", display: "swap", weight: ["500", "600", "700"] });
const dmSans = DM_Sans({ subsets: ["latin"], variable: "--font-dm-sans", display: "swap", weight: ["400", "500", "600", "700"] });

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: "#9100B0",
};

export const metadata: Metadata = {
  title: "MarketFlow",
  description: "Capture leads, answer them on WhatsApp and the web, and follow up until they buy. MarketFlow is the marketing and CRM workspace by Codevertex.",
  icons: { icon: [{ url: "/favicon.svg", type: "image/svg+xml" }], apple: "/icons/apple-touch-icon.png" },
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "MarketFlow" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${outfit.variable} ${dmSans.variable} h-full`} suppressHydrationWarning>
      <body className="min-h-full flex flex-col font-sans antialiased">
        <Providers>{children}</Providers>
        <InstallPrompt />
        <UpdatePrompt />
      </body>
    </html>
  );
}
