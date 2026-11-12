import { describe, expect, it } from "vitest";
import type { InboxItem } from "@/lib/api/inbox";
import type { MyAccess } from "@/lib/access/role-access";
import { canModerate } from "./moderation";

const item = (over: Partial<InboxItem> = {}): InboxItem => ({
  id: "1",
  kind: "comment",
  platform: "facebook",
  contact_id: "c",
  text: "hi",
  at: "2026-11-12T10:00:00Z",
  intent_status: "tagged",
  can_reply: true,
  can_moderate: true,
  ...over,
});
const who = (role: string, platform_owner = false): MyAccess => ({
  role,
  roles: role ? [role] : [],
  restricted: role === "app_reviewer",
  platform_owner,
});

describe("canModerate", () => {
  it("shows Hide and Delete on Facebook and Instagram comments to members, admins and the app reviewer", () => {
    for (const role of ["fbo_owner", "marketflow_admin", "app_reviewer"]) {
      expect(canModerate(item(), who(role)), role).toBe(true);
      expect(canModerate(item({ platform: "instagram" }), who(role)), role).toBe(true);
    }
    expect(canModerate(item(), who("", true))).toBe(true);
  });

  it("hides them from viewers and while the role is unknown", () => {
    expect(canModerate(item(), who("viewer"))).toBe(false);
    expect(canModerate(item(), undefined)).toBe(false);
  });

  it("never offers them on a DM or a deleted comment", () => {
    expect(canModerate(item({ kind: "dm" }), who("fbo_owner"))).toBe(false);
    expect(canModerate(item({ deleted_at: "2026-11-12T11:00:00Z" }), who("fbo_owner"))).toBe(false);
    expect(canModerate(item({ can_moderate: false }), who("fbo_owner"))).toBe(false);
  });
});
