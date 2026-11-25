/**
 * The caller's MarketFlow role as the UI uses it to shape the menu, guard pages and hide buttons
 * (GET /api/v1/me/access). marketflow-api's role gate stays the authority: this only spares the
 * user screens and buttons the API would refuse.
 */

export const APP_REVIEWER = "app_reviewer";
export const ROLE_ADMIN = "marketflow_admin";
export const ROLE_MEMBER = "fbo_owner";

export interface MyAccess {
  /** The effective MarketFlow role (the highest held), or "" when the caller has none here. */
  role: string;
  roles: string[];
  /** The role works from an explicit allow-list (the app reviewer), not the role ladder. */
  restricted: boolean;
  platform_owner: boolean;
}

/**
 * Pages (after /{orgSlug}) a restricted role may open; a page covers its detail pages. Mirrors the
 * read side of marketflow-api's rbac.restrictedRoleCapabilities: keep the two in step.
 */
const RESTRICTED_PAGES: Record<string, { open: string[]; closed: string[] }> = {
  [APP_REVIEWER]: {
    open: ["/dashboard", "/studio", "/leads", "/inbox", "/campaigns", "/settings/integrations"],
    // Studio pages that are not about an ad: autopilot and market research. The posting calendar
    // is open (owner 2026-11-14): the reviewer deletes a post from it for instagram_manage_contents.
    closed: ["/studio/autopilot", "/studio/research"],
  },
};

/** Connect routes a restricted role may start (marketflow-api allows the same authorize paths). */
const RESTRICTED_CONNECT_PATHS: Record<string, string[]> = {
  [APP_REVIEWER]: ["/api/v1/integrations/meta/authorize"],
};

type Access = MyAccess | null | undefined;

/** The restricted role the caller works under, or "" (unknown access is not restricted). */
function restrictedRole(access: Access): string {
  if (!access || access.platform_owner || !access.restricted) return "";
  return RESTRICTED_PAGES[access.role] ? access.role : "";
}

export function isRestricted(access: Access): boolean {
  return restrictedRole(access) !== "";
}

function under(path: string, page: string): boolean {
  return path === page || path.startsWith(`${page}/`);
}

/** Whether the caller may open a page; path is the part after /{orgSlug} ("" or "/" is the org home). */
export function pageAllowed(path: string, access: Access): boolean {
  const role = restrictedRole(access);
  if (!role) return true;
  const p = path.replace(/\/+$/, "");
  if (p === "") return true; // the org home only redirects to the dashboard
  const { open, closed } = RESTRICTED_PAGES[role];
  if (closed.some((c) => under(p, c))) return false;
  return open.some((o) => under(p, o));
}

/**
 * Who may change what a page (after /{orgSlug}) shows, as marketflow-api's write gate decides it:
 * "form" is an admin's page switched off as a whole for others, "admin" an admin's page whose own
 * controls handle it, "member" members and admins, "any" nothing to change or the caller's own
 * account. A test keeps every page in this table.
 */
export const PAGE_WRITES: Record<string, "form" | "admin" | "member" | "any"> = {
  "/": "any",
  "/dashboard": "any",
  "/onboarding": "any",
  "/team": "member",
  "/leads": "member",
  "/contacts": "member",
  "/campaigns": "member",
  "/studio": "member",
  "/inbox": "member",
  "/funnels": "member",
  "/sequences": "member",
  "/chat": "member",
  "/meetings": "member",
  "/short-links": "member",
  "/knowledge": "member",
  "/crm/deals": "member",
  "/crm/accounts": "member",
  "/crm/activities": "member",
  "/crm/tasks": "member",
  "/crm/segments": "member",
  "/settings": "any",
  "/settings/profile": "form",
  "/settings/sales-follow-up": "form",
  "/settings/lead-response": "form",
  "/settings/lead-filter": "form",
  "/settings/run-ads": "form",
  "/settings/reports": "form",
  "/settings/marketing-context": "admin",
  "/settings/team": "admin",
  "/settings/integrations": "admin",
  "/settings/custom-fields": "admin",
  "/settings/ads-setup": "admin",
  "/settings/testimonials": "member",
  "/settings/ppb-approvals": "member",
  "/settings/agents": "member",
  "/settings/billing": "any",
  "/settings/invite": "any",
  "/settings/audit": "any",
};

/** Who may change a page; a detail page follows its parent. */
export function pageWrites(path: string): (typeof PAGE_WRITES)[string] | undefined {
  for (let p = path.replace(/\/+$/, "") || "/"; p; p = p.slice(0, p.lastIndexOf("/"))) {
    if (PAGE_WRITES[p]) return PAGE_WRITES[p];
  }
  return undefined;
}

/** The sidebar groups with the items the caller may open; a group left empty is dropped. */
export function filterNavGroups<G extends { items: { href: string }[] }>(groups: G[], access: Access): G[] {
  if (!isRestricted(access)) return groups;
  return groups
    .map((g) => ({ ...g, items: g.items.filter((i) => pageAllowed(i.href, access)) }))
    .filter((g) => g.items.length > 0);
}

/** Post an approved ad and boost it: admins, members and the app reviewer. */
export function canPublish(access: Access): boolean {
  if (!access) return false;
  if (access.platform_owner) return true;
  return access.roles.some((r) => r === ROLE_ADMIN || r === ROLE_MEMBER || r === APP_REVIEWER);
}

/**
 * An admin of this organisation, or the platform owner. Mirrors marketflow-api's adminOnly gate
 * (record deletes, permanent deletes, settings). While the role is unknown this is false.
 */
export function isAdmin(access: Access): boolean {
  if (!access) return false;
  return access.platform_owner || access.roles.includes(ROLE_ADMIN);
}

/**
 * Delete a published post from its platform: admins (owner 2026-11-25) and the app reviewer, who
 * shows instagram_manage_contents in App Review. Mirrors marketflow-api's CanDelete.
 */
export function canDeleteFromPlatform(access: Access): boolean {
  return isAdmin(access) || isRestricted(access);
}

/**
 * Start an integration's connection (owner 2026-11-12: admin only, plus the reviewer for Meta).
 * While the role is unknown the button shows and the API decides.
 */
export function canConnectIntegration(access: Access, authorizePath: string): boolean {
  if (!access || access.platform_owner) return true;
  if (access.roles.includes(ROLE_ADMIN)) return true;
  const role = restrictedRole(access);
  return role !== "" && (RESTRICTED_CONNECT_PATHS[role] ?? []).includes(authorizePath);
}
