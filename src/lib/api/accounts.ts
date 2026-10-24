import { apiClient } from "./client";
import type { Contact } from "./contacts";
import type { Paginated } from "./types";

/** A company or organisation contacts belong to (marketflow-api ent.Account). */
export interface Account {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  phone?: string | null;
  employee_count?: number | null;
  annual_revenue?: number | null;
  created_at: string;
}

export interface AccountInput {
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  employee_count?: number;
}

export const accountsApi = {
  list: (page: number, limit = 25) => apiClient.get<Paginated<Account>>("/api/v1/accounts", { params: { page, limit } }).then((r) => r.data),
  create: (data: AccountInput) => apiClient.post<Account>("/api/v1/accounts", data).then((r) => r.data),
  update: (id: string, data: Partial<AccountInput>) => apiClient.put<Account>(`/api/v1/accounts/${id}`, data).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/api/v1/accounts/${id}`).then(() => undefined),
  contacts: (id: string) => apiClient.get<{ data?: Contact[] } | Contact[]>(`/api/v1/accounts/${id}/contacts`).then((r) => r.data),
};
