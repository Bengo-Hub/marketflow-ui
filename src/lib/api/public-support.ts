/**
 * Public support requests from a MarketFlow page. The same path the chat widget uses: the
 * visitor's email is verified with a one-time code (auth-api's public codes), and the verified
 * code opens a ticket in ticketing-api for the page's tenant. marketflow-ai forwards all three
 * calls (its /api/v1/public/otp and /tickets routes), keyed by the X-Tenant-ID slug.
 * Plain fetch: a visitor's request never carries a signed-in user's token.
 */
import { AI_API_URL } from "@/lib/urls";

export interface PublicTicketResult {
  ticket_id?: string;
  ticket_number?: string;
  status?: string;
}

/** The visitor-facing reason a call failed. */
function failure(status: number, body: unknown): string {
  if (status === 429) return "Too many requests just now. Please wait a minute and try again.";
  if (status === 0) return "We could not reach the support desk. Check your connection and try again.";
  const b = (body ?? {}) as { error?: string | { message?: string }; message?: string };
  const msg = typeof b.error === "string" ? b.error : b.error?.message || b.message;
  if (status >= 400 && status < 500 && typeof msg === "string" && msg.length < 160) return msg;
  return "That did not go through on our side. Please try again.";
}

async function post<T>(tenantSlug: string, path: string, payload: Record<string, unknown>, headers: Record<string, string> = {}): Promise<T> {
  let r: Response;
  try {
    r = await fetch(`${AI_API_URL}/api/v1/public${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Tenant-ID": tenantSlug, ...headers },
      body: JSON.stringify(payload),
    });
  } catch {
    throw new Error(failure(0, null));
  }
  const body = await r.json().catch(() => null);
  if (!r.ok) throw new Error(failure(r.status, body));
  return (body ?? {}) as T;
}

/** Sends a six-digit code to the visitor's email. */
export function sendSupportCode(tenantSlug: string, email: string): Promise<unknown> {
  return post(tenantSlug, "/otp/send", { email, tenant_slug: tenantSlug });
}

/** Trades the code for the one-use token a ticket needs. */
export async function verifySupportCode(tenantSlug: string, email: string, otp: string): Promise<string> {
  const res = await post<{ otp_token?: string }>(tenantSlug, "/otp/verify", { email, otp });
  if (!res.otp_token) throw new Error("We could not verify the code. Please request a new one.");
  return res.otp_token;
}

/** Opens the ticket. The email on it is the verified one, never a typed field. */
export function createSupportTicket(
  tenantSlug: string,
  otpToken: string,
  input: { name: string; subject: string; description: string },
): Promise<PublicTicketResult> {
  return post<PublicTicketResult>(tenantSlug, "/tickets", input, { "X-OTP-Token": otpToken });
}
