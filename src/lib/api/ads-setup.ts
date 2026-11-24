import { apiClient } from "./client";

/**
 * Ads account setup assistant (item 65): a checklist per connected ad account. A fix runs only
 * after the owner has seen its changes and confirmed. Contract: marketflow-api
 * internal/modules/adsetup.
 */

export type SetupStatus = "ok" | "action" | "warning" | "info" | "unknown";

export interface SetupAccount {
  connected_account_id: string;
  platform: "google" | "meta" | "tiktok" | string;
  external_id: string;
  name: string;
  status: string;
}

export interface SetupField {
  key: string;
  label: string;
  value: string;
  max?: number;
  required?: boolean;
}

export interface SetupFix {
  label: string;
  changes: string[];
  fields?: SetupField[];
  token: string;
}

export interface SetupItem {
  key: string;
  title: string;
  status: SetupStatus;
  detail: string;
  points?: string[];
  link?: { label: string; url: string };
  fix?: SetupFix;
}

export interface SetupChecklist {
  account: SetupAccount;
  items: SetupItem[];
  checked_at: string;
  can_fix: boolean;
}

const base = "/api/v1/ads-setup";

export const adsSetupApi = {
  accounts: () => apiClient.get<{ data: SetupAccount[] }>(base).then((r) => r.data.data ?? []),
  checklist: (id: string, refresh = false) =>
    apiClient.get<SetupChecklist>(`${base}/${id}`, { params: refresh ? { refresh: 1 } : undefined }).then((r) => r.data),
  fix: (id: string, item: string, token: string, input: Record<string, string>) =>
    apiClient.post<SetupChecklist>(`${base}/${id}/fix`, { item, token, input }).then((r) => r.data),
};

const ORDER: Record<SetupStatus, number> = { action: 0, warning: 1, unknown: 2, info: 3, ok: 4 };

/** Problems first; the API's own order (tracking before extras) within a status. */
export function sortItems(items: SetupItem[]): SetupItem[] {
  return [...items].sort((a, b) => ORDER[a.status] - ORDER[b.status]);
}

/** "2 things to fix, 1 to improve" or "Everything is set up". */
export function summary(items: SetupItem[]): string {
  const n = (s: SetupStatus) => items.filter((i) => i.status === s).length;
  const parts: string[] = [];
  if (n("action")) parts.push(`${n("action")} to fix`);
  if (n("warning")) parts.push(`${n("warning")} to improve`);
  if (n("unknown")) parts.push(`${n("unknown")} to check yourself`);
  return parts.length ? parts.join(", ") : "Everything is set up";
}
