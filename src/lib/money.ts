/**
 * MarketFlow's money helpers are shared-ui-lib's: one formatter (decimal places per currency,
 * so UGX shows no cents) and one text form ("KES 5,000") for prompts and notes. Nothing here
 * keeps its own currency list or rate; rates live in treasury-api and are read by the API.
 */
import { formatCurrency, formatMoneyText, normalizeCurrency } from "@bengo-hub/shared-ui-lib/format";

export { formatMoneyText, normalizeCurrency };
export { SUPPORTED_CURRENCIES, CURRENCY_META, parseMoneyInput } from "@bengo-hub/shared-ui-lib/format";

/** The platform default when the tenant profile has not loaded (marketflow-api MF_MONEY_DEFAULT_CURRENCY). */
export const FALLBACK_CURRENCY = "KES";

/** An amount with its currency symbol, e.g. "Ksh 5,000.00". A missing currency is the fallback. */
export function formatMoney(amount: number | null | undefined, currency?: string | null): string {
  return formatCurrency(amount ?? 0, normalizeCurrency(currency) || FALLBACK_CURRENCY);
}

/** Whole amounts with the currency code, for budgets shown in prose: "KES 5,000". */
export function formatBudget(amount: number | null | undefined, currency?: string | null): string {
  return formatMoneyText(Math.round(amount ?? 0), normalizeCurrency(currency) || FALLBACK_CURRENCY);
}
