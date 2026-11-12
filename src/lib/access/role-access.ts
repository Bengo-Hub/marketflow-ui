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
    // Studio pages that are not about an ad: autopilot, the posting calendar, market research.
    closed: ["/studio/autopilot", "/studio/calendar", "/studio/research"],
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
 * Start an integration's connection (owner 2026-11-12: admin only, plus the reviewer for Meta).
 * While the role is unknown the button shows and the API decides.
 */
export function canConnectIntegration(access: Access, authorizePath: string): boolean {
  if (!access || access.platform_owner) return true;
  if (access.roles.includes(ROLE_ADMIN)) return true;
  const role = restrictedRole(access);
  return role !== "" && (RESTRICTED_CONNECT_PATHS[role] ?? []).includes(authorizePath);
}
