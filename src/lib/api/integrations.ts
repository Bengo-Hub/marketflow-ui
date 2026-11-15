import { apiClient } from "./client";

/**
 * How a connected account is doing (marketflow-api integrations/account_health.go): "expiring"
 * means renew by expires_at, "expired" means it stopped working (the token health job marked it,
 * or a recent post failed because the platform no longer accepts the connection).
 */
export type AccountHealth = "ok" | "expiring" | "expired";

export type ConnectedAccount = {
  type: string;
  external_id: string;
  name: string;
  picture_url?: string;
  default?: boolean;
  health?: AccountHealth;
  /** Renew-by date, sent only while the account is expiring. */
  expires_at?: string;
  /** Why the account needs reconnecting, in plain words. */
  problem?: string;
};

export type Integration = {
  provider: string;
  name: string;
  connected: boolean;
  fields: Record<string, string>;
  accounts?: ConnectedAccount[];
};

export const integrationsApi = {
  list: async () => (await apiClient.get<{ integrations: Integration[] }>("/api/v1/integrations")).data,
};

export function needsReconnect(a: ConnectedAccount): boolean {
  return a.health === "expiring" || a.health === "expired";
}

/** Every connected account that needs someone to connect it again, with its provider. */
export function accountsNeedingReconnect(list: Integration[] | undefined): (ConnectedAccount & { provider: string })[] {
  return (list ?? []).flatMap((i) =>
    i.connected ? (i.accounts ?? []).filter(needsReconnect).map((a) => ({ ...a, provider: i.provider })) : [],
  );
}

const dateFmt = new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" });

/** A short status line for an account that needs attention: "Expired" or "Reconnect by 20 Nov 2026". */
export function reconnectLabel(a: ConnectedAccount): string {
  if (a.health === "expired") return "Stopped working, reconnect";
  if (a.health === "expiring" && a.expires_at) return `Reconnect by ${dateFmt.format(new Date(a.expires_at))}`;
  return "Reconnect soon";
}
