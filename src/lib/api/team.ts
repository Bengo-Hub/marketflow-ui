import { apiClient } from "./client";

/** MarketFlow roles a tenant admin can give (marketflow-api rbac.AssignableRoles). */
export const TEAM_ROLES = [
  { value: "marketflow_admin", label: "Admin", hint: "Everything, including the team, settings, integrations, autopilot and lead export" },
  { value: "fbo_owner", label: "Member", hint: "Day-to-day marketing: create, approve, boost, post, reply and use AI credits" },
  { value: "viewer", label: "Viewer", hint: "Can look, cannot change anything" },
] as const;

export type TeamRole = (typeof TEAM_ROLES)[number]["value"];

export interface TeamMember {
  id: string;
  email: string;
  status: string;
  roles: string[];
  you: boolean;
  created_at: string;
}

/** GET /tenant/members: can_manage says whether the caller may invite, change roles and remove. */
export interface TeamList {
  members: TeamMember[];
  total: number;
  can_manage: boolean;
}

export interface InviteResult {
  email: string;
  role: TeamRole;
  /** A brand-new account was made; it sets its password from the emailed link. */
  new_account: boolean;
}

export const teamApi = {
  list: () =>
    apiClient.get<TeamList>("/api/v1/tenant/members").then((r) => ({ ...r.data, members: r.data.members ?? [] })),
  invite: (body: { email: string; name?: string; role: TeamRole }) =>
    apiClient.post<InviteResult>("/api/v1/tenant/members/invite", body).then((r) => r.data),
  setRole: (id: string, role: TeamRole) => apiClient.put(`/api/v1/tenant/members/${id}`, { role }).then(() => undefined),
  remove: (id: string) => apiClient.delete(`/api/v1/tenant/members/${id}`).then(() => undefined),
};

export function roleLabel(code?: string): string {
  return TEAM_ROLES.find((r) => r.value === code)?.label ?? "No role";
}
