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
  /** A picture the owner may tick (value "yes"), shown cut to the shape that is sent. */
  picture?: { url: string; source: string; ratio: number };
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
  /** What the owner does themselves, in order. */
  steps?: string[];
  /** The platform's own words, for support. */
  support?: string;
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

/** The page's sections, each in the API's own order. "Done" also counts nothing-to-do notes. */
export function groupItems(items: SetupItem[]): { key: string; title: string; items: SetupItem[] }[] {
  const of = (s: SetupStatus) => items.filter((i) => i.status === s);
  return [
    { key: "action", title: "Fix now", items: of("action") },
    { key: "warning", title: "Improve", items: of("warning") },
    { key: "unknown", title: "Check yourself", items: of("unknown") },
    { key: "info", title: "Good to know", items: of("info") },
    { key: "ok", title: "Done", items: of("ok") },
  ].filter((g) => g.items.length > 0);
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
