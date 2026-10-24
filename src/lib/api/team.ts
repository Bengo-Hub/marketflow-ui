import { apiClient } from "./client";

/** MarketFlow roles a tenant admin can give (marketflow-api rbac.AssignableRoles). */
export const TEAM_ROLES = [
  { value: "marketflow_admin", label: "Admin", hint: "Everything, including the team and settings" },
  { value: "fbo_owner", label: "Member", hint: "Leads, contacts, campaigns, funnels and chat" },
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
  user_id: string;
  email: string;
  role: TeamRole;
  new_account: boolean;
  /** Only for a brand-new account, returned once; the person changes it on first sign-in. */
  temp_password?: string;
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
