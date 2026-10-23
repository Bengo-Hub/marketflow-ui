import type { Metadata } from "next";
import { AppCanvas } from "@/components/ui-kit";
import { AuthRedirect } from "@/components/landing/auth-actions";
import { SiteNav } from "@/components/landing/site-nav";
import { Hero } from "@/components/landing/hero";
import { Audiences, Capabilities, Closing, Connects, HowItWorks, SiteFooter } from "@/components/landing/sections";
import { Pricing } from "@/components/landing/pricing";

export const metadata: Metadata = {
  title: "MarketFlow: answer every enquiry, follow up every lead",
  description:
    "Your public page, lead forms, chat, follow-ups and sales pipeline in one place. MarketFlow is the marketing and CRM workspace by Codevertex.",
};

export default function LandingPage() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <AppCanvas />
      <AuthRedirect />
      <SiteNav />
      <main id="main" className="flex-1">
        <Hero />
        <Capabilities />
        <HowItWorks />
        <Audiences />
        <Connects />
        <Pricing />
        <Closing />
      </main>
      <SiteFooter />
    </div>
  );
}
