/**
 * Gift a friend (owner, 2026-11-12): a business shares its link, and when the invited business
 * makes its first payment both get AI credits (subscriptions-api pays it, at most a set number of
 * friends per business). Pure helpers for the Invite and earn page and /join.
 */
import { aiClient, subscriptionsClient } from "@/lib/api/client";
import { APP_URL } from "@/lib/urls";

export interface ReferralFriend {
  name: string;
  joined_at: string;
  rewarded: boolean;
}

export interface ReferralSummary {
  referral_code: string;
  reward_credits: number;
  invite_cap: number;
  rewards_used: number;
  rewards_left: number;
  credits_earned: number;
  credit_value_kes: number;
  friends: ReferralFriend[];
}

export interface ChatAllowance {
  free_turns_daily: number;
  turns_used_today: number;
  free_turns_left: number;
  turns_per_credit: number;
  resets_at: string;
  kes_per_usd?: number;
}

export const referralsApi = {
  summary: () => subscriptionsClient.get<ReferralSummary>("/api/v1/credits/referrals").then((r) => ({ ...r.data, friends: r.data.friends ?? [] })),
  chatAllowance: () => aiClient.get<ChatAllowance>("/api/v1/chat/allowance").then((r) => r.data),
};

/** A referral code as subscriptions-api writes it ("CV-" and letters or digits), or "". */
export function cleanReferralCode(raw: string | null | undefined): string {
  const c = (raw ?? "").trim();
  return /^CV-[A-Za-z0-9]{3,29}$/.test(c) ? c : "";
}

/** The link a business shares: MarketFlow sign-up with its code. */
export function inviteLink(code: string, base: string = APP_URL): string {
  return `${base.replace(/\/$/, "")}/join?ref=${encodeURIComponent(code)}`;
}

/** A WhatsApp share link with the invitation text. */
export function whatsAppShare(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

/**
 * What a reward is worth, in KES at the smallest bundle's price per credit and in USD at the
 * platform rate when one is known. Rounded the way people read prices.
 */
export function rewardValue(credits: number, creditValueKES: number, kesPerUSD?: number): { kes: string; usd?: string } {
  const kes = credits * creditValueKES;
  const out: { kes: string; usd?: string } = { kes: `KES ${kes.toLocaleString("en-KE", { maximumFractionDigits: 0 })}` };
  if (kesPerUSD && kesPerUSD > 0) out.usd = `USD ${(kes / kesPerUSD).toFixed(2)}`;
  return out;
}

/** The share text, honest about when the reward is paid. */
export function inviteMessage(businessName: string, link: string, credits: number): string {
  const who = businessName.trim() || "I";
  return `${who === "I" ? "I use" : `${who} uses`} MarketFlow to win customers on WhatsApp and social media. ` +
    `Sign up with this link and we both get ${credits} free AI credits once you make your first payment: ${link}`;
}

/** "in 3 h 20 min" until a reset time, or "soon" when it has passed. */
export function untilReset(resetsAt: string, now: Date = new Date()): string {
  const ms = new Date(resetsAt).getTime() - now.getTime();
  if (!Number.isFinite(ms) || ms <= 0) return "soon";
  const mins = Math.ceil(ms / 60000);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return h > 0 ? `in ${h} h ${m} min` : `in ${m} min`;
}
