"use client";

import { CURRENCY_META, SUPPORTED_CURRENCIES } from "@/lib/money";

/**
 * Picks a currency from the platform's one list (shared-ui-lib CURRENCY_META, the same list
 * treasury-api converts). With emptyLabel set, an empty first option means "use the default".
 */
export function CurrencySelect({
  id,
  value,
  onChange,
  emptyLabel,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (code: string) => void;
  emptyLabel?: string;
  disabled?: boolean;
}) {
  return (
    <select
      id={id}
      className="min-h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(e.target.value)}
    >
      {emptyLabel !== undefined && <option value="">{emptyLabel}</option>}
      {SUPPORTED_CURRENCIES.map((code) => (
        <option key={code} value={code}>
          {code}, {CURRENCY_META[code]?.name ?? code}
        </option>
      ))}
    </select>
  );
}
