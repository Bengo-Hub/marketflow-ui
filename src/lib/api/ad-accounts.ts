import { apiClient } from "./client";

/** A connected ad account and whether the business's ads run on it (marketflow-api adsmanager.AdAccountChoice). */
export interface AdAccountChoice {
  connected_account_id: string;
  platform: string;
  external_id: string;
  name: string;
  currency: string;
  /** Meta only: in a business portfolio, a person's own, or not known. */
  owner: "portfolio" | "personal" | "unknown";
  business?: string;
  chosen: boolean;
  in_use: boolean;
  hidden: boolean;
}

export interface AdAccountChoices {
  data: AdAccountChoice[];
  can_edit: boolean;
}

export const adAccountsApi = {
  list: () => apiClient.get<AdAccountChoices>("/api/v1/ads/ad-accounts").then((r) => r.data),
  set: (id: string, body: { default?: boolean; hidden?: boolean }) =>
    apiClient.put<AdAccountChoices>(`/api/v1/ads/ad-accounts/${id}`, body).then((r) => r.data),
};

/** The accounts per platform, in the order the API lists them. */
export function groupAdAccounts(list: AdAccountChoice[]): [string, AdAccountChoice[]][] {
  const out = new Map<string, AdAccountChoice[]>();
  for (const a of list) out.set(a.platform, [...(out.get(a.platform) ?? []), a]);
  return [...out.entries()];
}
