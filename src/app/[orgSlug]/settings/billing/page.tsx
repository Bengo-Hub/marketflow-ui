"use client";

import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CreditCard, Wallet, Zap, TrendingUp, ArrowUpRight, Info } from "lucide-react";

const TREASURY_URL = process.env.NEXT_PUBLIC_TREASURY_URL || "https://booksapi.codevertexitsolutions.com";
const SUBSCRIPTIONS_URL = process.env.NEXT_PUBLIC_SUBSCRIPTIONS_URL || "https://subscriptionsapi.codevertexitsolutions.com";

type Subscription = {
  plan_code?: string;
  status?: string;
  features?: Record<string, any>;
  limits?: Record<string, any>;
};

type WalletData = {
  id: string;
  balance: number;
  currency: string;
  is_active: boolean;
};

type UsageSummary = {
  leads_captured?: number;
  ai_chat_messages?: number;
  campaigns_active?: number;
  emails_sent?: number;
};

const PLAN_LIMITS: Record<string, { leads: string; chats: string; campaigns: string }> = {
  STARTER: { leads: "100", chats: "5", campaigns: "1" },
  GROWTH: { leads: "1,000", chats: "100", campaigns: "5" },
  PRO: { leads: "Unlimited", chats: "500", campaigns: "Unlimited" },
};

export default function BillingPage() {
  const { data: subscription, isLoading: subLoading } = useQuery<Subscription>({
    queryKey: ["subscription"],
    queryFn: async () => {
      try {
        const r = await apiClient.get<Subscription>(`${SUBSCRIPTIONS_URL}/api/v1/subscription`);
        return r.data;
      } catch {
        return { plan_code: "STARTER", status: "FREE" };
      }
    },
  });

  const { data: wallet, isLoading: walletLoading } = useQuery<WalletData | null>({
    queryKey: ["wallet"],
    queryFn: async () => {
      try {
        const r = await apiClient.get<{ data: WalletData }>(`${TREASURY_URL}/api/v1/wallets/me`);
        return r.data.data;
      } catch {
        return null;
      }
    },
  });

  const { data: usage } = useQuery<UsageSummary>({
    queryKey: ["usage"],
    queryFn: async () => {
      try {
        const r = await apiClient.get<UsageSummary>(`${SUBSCRIPTIONS_URL}/api/v1/usage`);
        return r.data;
      } catch {
        return {};
      }
    },
  });

  const plan = subscription?.plan_code ?? "STARTER";
  const limits = PLAN_LIMITS[plan] ?? PLAN_LIMITS.STARTER;
  const planLabel = plan === "STARTER" ? "Starter (Free)" : plan === "GROWTH" ? "Growth" : plan === "PRO" ? "Pro" : plan;

  const openTopUp = () => {
    const params = new URLSearchParams({
      embed: "false",
      currency: "KES",
      reference_type: "wallet_topup",
      source_service: "marketflow",
      description: "MarketFlow wallet top-up",
      gateways: "paystack,mpesa",
    });
    window.open(`${TREASURY_URL}/pay?${params}`, "_blank");
  };

  const openUpgrade = () => {
    window.open(`${SUBSCRIPTIONS_URL}/plans`, "_blank");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Billing & Usage</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your plan, AI credits, wallet balance, and view usage against limits.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Plan</CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {subLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-2xl font-semibold">{planLabel}</div>
                <Badge
                  variant={subscription?.status === "ACTIVE" ? "default" : "outline"}
                  className="mt-1 text-xs"
                >
                  {subscription?.status ?? "FREE"}
                </Badge>
                <Button variant="outline" size="sm" className="mt-3 w-full" onClick={openUpgrade}>
                  <ArrowUpRight className="mr-1 h-3 w-3" /> Upgrade
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Wallet</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {walletLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-2xl font-semibold">
                  {wallet ? `KES ${wallet.balance.toLocaleString()}` : "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Used for ad campaigns + AI credits
                </div>
                <Button
                  size="sm"
                  className="mt-3 w-full bg-amber-400 hover:bg-amber-500 text-black"
                  onClick={openTopUp}
                >
                  Top up wallet
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">AI Chats</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{usage?.ai_chat_messages ?? 0}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              used this month ({limits.chats} included)
            </div>
            <UsageBar used={usage?.ai_chat_messages ?? 0} limit={parseInt(limits.chats.replace(/,/g, "")) || 9999} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium uppercase text-muted-foreground">Leads</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-semibold">{usage?.leads_captured ?? 0}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              captured this month ({limits.leads} limit)
            </div>
            <UsageBar used={usage?.leads_captured ?? 0} limit={parseInt(limits.leads.replace(/,/g, "")) || 9999} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center gap-2">
          <Info className="h-4 w-4 text-amber-500" />
          <CardTitle className="text-base">Service Charges</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>MarketFlow charges a small service fee on ad campaign budgets:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>5%</strong> of your ads budget per campaign</li>
            <li>Minimum <strong>KES 5</strong>, maximum <strong>KES 500</strong> per campaign</li>
            <li>Service charges are deducted from your wallet when the AI sets up a campaign</li>
            <li>The ads budget itself is charged by the ad platform (Meta, Google) to your connected ad account</li>
          </ul>
          <p className="mt-3">
            AI credits cost <strong>KES 10 per credit</strong> beyond your plan&apos;s included allowance.
            Purchase more by topping up your wallet.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function UsageBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500";
  return (
    <div className="mt-2 h-1.5 w-full rounded-full bg-muted">
      <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}
