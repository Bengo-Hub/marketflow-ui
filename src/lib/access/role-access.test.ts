import { describe, expect, it } from "vitest";
import {
  APP_REVIEWER,
  canConnectIntegration,
  canPublish,
  filterNavGroups,
  isRestricted,
  pageAllowed,
  type MyAccess,
} from "./role-access";

const access = (role: string, extra: Partial<MyAccess> = {}): MyAccess => ({
  role,
  roles: role ? [role] : [],
  restricted: role === APP_REVIEWER,
  platform_owner: false,
  ...extra,
});

const reviewer = access(APP_REVIEWER);
const member = access("fbo_owner");
const admin = access("marketflow_admin");
const viewer = access("viewer");

// The sidebar's shape (app-sidebar navGroups), kept to the hrefs the filter reads.
const groups = [
  {
    label: "Marketing",
    items: [
      "/dashboard", "/team", "/leads", "/contacts", "/campaigns", "/studio", "/inbox", "/funnels",
      "/sequences", "/chat", "/meetings", "/short-links", "/knowledge",
    ].map((href) => ({ href })),
  },
  { label: "CRM", items: ["/crm/deals", "/crm/accounts", "/crm/activities", "/crm/tasks", "/crm/segments"].map((href) => ({ href })) },
  {
    label: "Settings",
    items: [
      "/settings", "/settings/profile", "/settings/testimonials", "/settings/marketing-context", "/settings/team",
      "/settings/integrations", "/settings/custom-fields", "/settings/agents", "/settings/billing", "/settings/audit",
    ].map((href) => ({ href })),
  },
];

const hrefs = (gs: { label: string; items: { href: string }[] }[]) => gs.flatMap((g) => g.items.map((i) => i.href));

describe("filterNavGroups", () => {
  it("leaves the app reviewer only what Meta's reviewers test", () => {
    const got = filterNavGroups(groups, reviewer);
    expect(hrefs(got)).toEqual(["/dashboard", "/leads", "/campaigns", "/studio", "/inbox", "/settings/integrations"]);
    expect(got.map((g) => g.label)).toEqual(["Marketing", "Settings"]);
  });

  it("changes nothing for the other roles, a platform owner, or while the role is unknown", () => {
    for (const a of [member, admin, viewer, access("", { platform_owner: true }), undefined, null]) {
      expect(filterNavGroups(groups, a)).toEqual(groups);
    }
  });

  it("does not restrict a reviewer who also holds a higher role", () => {
    const both = access("fbo_owner", { roles: ["fbo_owner", APP_REVIEWER], restricted: false });
    expect(filterNavGroups(groups, both)).toEqual(groups);
  });
});

describe("pageAllowed", () => {
  it("opens the reviewer's pages and their detail pages", () => {
    for (const p of ["", "/", "/dashboard", "/studio", "/studio/abc", "/leads", "/leads/abc", "/inbox", "/campaigns", "/campaigns/abc", "/settings/integrations"]) {
      expect(pageAllowed(p, reviewer), p).toBe(true);
    }
  });

  it("closes everything else to the reviewer", () => {
    for (const p of [
      "/team", "/contacts", "/contacts/abc", "/chat", "/funnels", "/crm/deals", "/settings", "/settings/team",
      "/settings/billing", "/settings/audit", "/settings/agents", "/settings/custom-fields", "/studio/autopilot",
      "/studio/calendar", "/studio/research", "/onboarding", "/leadsx", "/dashboardx",
    ]) {
      expect(pageAllowed(p, reviewer), p).toBe(false);
    }
  });

  it("opens every page to everyone else", () => {
    expect(pageAllowed("/settings/team", member)).toBe(true);
    expect(pageAllowed("/contacts", undefined)).toBe(true);
  });
});

describe("isRestricted, canPublish and canConnectIntegration", () => {
  it("knows the restricted role", () => {
    expect(isRestricted(reviewer)).toBe(true);
    expect(isRestricted(member)).toBe(false);
    expect(isRestricted(undefined)).toBe(false);
  });

  it("lets admins, members and the reviewer post and boost, not viewers", () => {
    expect(canPublish(admin)).toBe(true);
    expect(canPublish(member)).toBe(true);
    expect(canPublish(reviewer)).toBe(true);
    expect(canPublish(viewer)).toBe(false);
    expect(canPublish(access("", { platform_owner: true }))).toBe(true);
  });

  it("keeps connecting an integration to admins, and Meta to the reviewer", () => {
    const meta = "/api/v1/integrations/meta/authorize";
    const google = "/api/v1/integrations/google/authorize";
    expect(canConnectIntegration(admin, meta)).toBe(true);
    expect(canConnectIntegration(admin, google)).toBe(true);
    expect(canConnectIntegration(reviewer, meta)).toBe(true);
    expect(canConnectIntegration(reviewer, google)).toBe(false);
    expect(canConnectIntegration(member, meta)).toBe(false);
    expect(canConnectIntegration(viewer, meta)).toBe(false);
    expect(canConnectIntegration(access("", { platform_owner: true }), google)).toBe(true);
  });

  it("shows Connect while the role is still unknown, and lets the API decide", () => {
    expect(canConnectIntegration(undefined, "/api/v1/integrations/meta/authorize")).toBe(true);
  });
});
