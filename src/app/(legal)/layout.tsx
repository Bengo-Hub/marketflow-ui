import { AppCanvas } from "@/components/ui-kit";
import { SiteNav } from "@/components/landing/site-nav";
import { SiteFooter } from "@/components/landing/sections";

/**
 * Public legal and data pages of MarketFlow. The policies themselves are the
 * single Codevertex copy at accounts.codevertexafrica.com (privacy, terms,
 * cookies, your data and your rights); this layout only frames the
 * MarketFlow-specific pages, such as the data deletion status Meta links to.
 */
export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <AppCanvas />
      <SiteNav />
      <main className="relative mx-auto w-full max-w-3xl px-4 pb-16 pt-24 sm:px-6">{children}</main>
      <SiteFooter />
    </div>
  );
}
