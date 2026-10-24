import type { Metadata } from "next";
import { Suspense } from "react";
import { DeletionStatus } from "./deletion-status";

export const metadata: Metadata = {
  title: "Data deletion | MarketFlow",
  description: "Check a request to delete data MarketFlow received from Facebook, Instagram or Threads.",
  robots: { index: false, follow: false },
};

const ACCOUNTS = "https://accounts.codevertexafrica.com";

export default function DataDeletionPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Data deletion</h1>
        <p className="text-muted-foreground">
          When you remove MarketFlow from your Facebook, Instagram or Threads settings, Meta tells us and we delete
          the access tokens and connections you granted. Meta gives you a confirmation code; enter it below to see
          your request.
        </p>
      </header>

      <Suspense fallback={null}>
        <DeletionStatus />
      </Suspense>

      <section className="glass rounded-2xl p-5 text-sm leading-relaxed text-muted-foreground">
        <h2 className="mb-2 text-base font-semibold text-foreground">Other ways to delete your data</h2>
        <p>
          You can also email{" "}
          <a className="text-primary underline" href="mailto:info@codevertexafrica.com">
            info@codevertexafrica.com
          </a>{" "}
          and we delete it for you. Leads and messages that people sent to a business stay with that business as its
          customer records. Read how we handle data in the{" "}
          <a className="text-primary underline" href={`${ACCOUNTS}/privacy#meta-data`}>
            privacy policy
          </a>{" "}
          and{" "}
          <a className="text-primary underline" href={`${ACCOUNTS}/data-requests`}>
            your data and your rights
          </a>
          .
        </p>
      </section>
    </div>
  );
}
