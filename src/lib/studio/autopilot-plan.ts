import type { AutopilotPlan, AutopilotPlanRefusal } from "@/lib/api/autopilot";

/**
 * Autopilot plan allowance (owner 2026-11-14): marketflow_autopilot from MarketFlow Lite up, and
 * max_autopilot_agents switched on at once (Lite 1, Growth 3, Pro 10, Business unlimited).
 */

/** The line the Autopilot page shows about the plan, or null while it is unknown. */
export function planSummary(plan: AutopilotPlan | undefined): string | null {
  if (!plan) return null;
  if (plan.unknown) return "Your plan could not be checked just now. Agents cannot be switched on until it can, so try again in a few minutes.";
  if (plan.exempt) return `No plan limit applies to this account. ${plan.active} agent${plan.active === 1 ? " is" : "s are"} on.`;
  if (!plan.included) return "Autopilot agents are not in your plan. They start on MarketFlow Lite.";
  if (plan.limit < 0) return `Your plan allows as many agents as you need. ${plan.active} ${plan.active === 1 ? "is" : "are"} on.`;
  return `Agents switched on: ${plan.active} of the ${plan.limit} your plan allows.`;
}

/** Whether to offer an upgrade next to the plan line. */
export function showUpgrade(plan: AutopilotPlan | undefined): boolean {
  if (!plan || plan.unknown || plan.exempt) return false;
  return !plan.included || !plan.can_activate;
}

/** Whether new agents can be made or hired: not when the plan definitely leaves Autopilot out. */
export function canCreateAgents(plan: AutopilotPlan | undefined): boolean {
  return !plan || plan.unknown === true || plan.included;
}

/** Whether a switched-off agent can be switched on under the plan. */
export function canSwitchOn(plan: AutopilotPlan | undefined): boolean {
  return !plan || plan.can_activate;
}

/** The message for a plan refusal from the API. */
export function refusalText(r: AutopilotPlanRefusal): string {
  switch (r.code) {
    case "autopilot_limit_reached":
      return r.limit !== undefined
        ? `Your plan allows ${r.limit} agent${r.limit === 1 ? "" : "s"} on at once. Switch one off, or upgrade for more.`
        : "Your plan's agent limit is reached. Switch one off, or upgrade for more.";
    case "autopilot_not_in_plan":
      return "Autopilot agents are not in your plan. Upgrade to MarketFlow Lite or higher to use them.";
    default:
      return "Your plan could not be checked just now. Try again in a few minutes.";
  }
}

/** The upgrade page inside the organisation, for example /acme/settings/billing. */
export function upgradeHref(orgSlug: string, path: string | undefined): string {
  const p = path && path.startsWith("/") ? path : "/settings/billing";
  return `/${orgSlug}${p}`;
}
