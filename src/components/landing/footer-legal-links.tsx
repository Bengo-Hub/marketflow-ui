"use client";

import { LegalLinks } from "@bengo-hub/shared-ui-lib/legal";

/**
 * The shared legal links for MarketFlow's public footer. The shared library's bundle drops the
 * "use client" directive, and LegalLinks has a button, so the server-rendered footer mounts it
 * through this client file.
 */
export function FooterLegalLinks() {
  return <LegalLinks showDataDeletion showAutopilotTerms />;
}
