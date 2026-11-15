"use client";

import { useState } from "react";
import { AlertTriangle, Megaphone } from "lucide-react";
import { needsReconnect, reconnectLabel, type ConnectedAccount } from "@/lib/api/integrations";

export type { ConnectedAccount } from "@/lib/api/integrations";

const kinds: Record<string, string> = {
  facebook_page: "Facebook Page",
  instagram_business: "Instagram",
  meta_ad_account: "Ad account",
  tiktok_advertiser: "TikTok advertiser",
  youtube_channel: "YouTube channel",
};

function Picture({ account }: { account: ConnectedAccount }) {
  const [broken, setBroken] = useState(false);
  if (account.picture_url && !broken) {
    return (
      // Provider CDNs (graph.facebook.com redirects, Instagram) are not in next/image's allow list.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={account.picture_url}
        alt={account.name}
        onError={() => setBroken(true)}
        className="h-9 w-9 shrink-0 rounded-full border object-cover"
      />
    );
  }
  if (account.type.endsWith("ad_account") || account.type === "tiktok_advertiser") {
    return (
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted">
        <Megaphone className="h-4 w-4 text-muted-foreground" aria-hidden />
      </span>
    );
  }
  return (
    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border bg-muted text-sm font-semibold">
      {(account.name || "?").charAt(0).toUpperCase()}
    </span>
  );
}

/**
 * The accounts a tenant connected through one provider, recognisable at a glance. An account that
 * is expiring or stopped working says so on its row; the card offers the reconnect.
 */
export function ConnectedAccounts({ accounts }: { accounts: ConnectedAccount[] }) {
  if (!accounts.length) return null;
  return (
    <ul className="divide-y rounded-md border bg-muted/30">
      {accounts.map((a) => {
        const attention = needsReconnect(a);
        return (
          <li key={`${a.type}:${a.external_id}`} className="flex items-center gap-3 px-3 py-2">
            <Picture account={a} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-medium">
                  {a.type === "instagram_business" ? `@${a.name}` : a.name || a.external_id}
                </span>
                {a.default && (
                  <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">
                    Default
                  </span>
                )}
                {attention && (
                  <span
                    className={`inline-flex shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                      a.health === "expired" ? "bg-destructive/10 text-destructive" : "bg-warning/15 text-warning"
                    }`}
                  >
                    <AlertTriangle className="h-3 w-3" aria-hidden />
                    {a.health === "expired" ? "Expired" : "Expiring"}
                  </span>
                )}
              </div>
              <div className="truncate text-xs text-muted-foreground">
                {kinds[a.type] ?? a.type} · <span className="font-mono">ID {a.external_id}</span>
              </div>
              {attention && (
                <p className={`mt-0.5 text-xs ${a.health === "expired" ? "text-destructive" : "text-warning"}`}>
                  {a.health === "expired" ? a.problem || reconnectLabel(a) : reconnectLabel(a)}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
