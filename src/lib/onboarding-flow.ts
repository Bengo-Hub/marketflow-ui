import type { Checklist } from "@/lib/api/onboarding";

/**
 * A new business goes through setup before the dashboard (owner, 2026-11-11: sign up, onboarding,
 * then the dashboard). Opened once per browser session while the checklist is neither complete
 * nor dismissed, so it never traps someone who skips it.
 */
export function shouldOpenOnboarding(c: Checklist | undefined, alreadyShown: boolean): boolean {
  return !!c && !c.complete && !c.dismissed && !alreadyShown;
}

/** Sends the owner on to the dashboard only when setup completes during this visit. */
export function justCompleted(previous: boolean | undefined, now: boolean | undefined): boolean {
  return previous === false && now === true;
}

export const onboardingShownKey = (orgSlug: string) => `mf_onboarding_shown_${orgSlug}`;
