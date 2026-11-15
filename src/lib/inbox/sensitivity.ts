/**
 * How readily the inbox tags buyers and answers them automatically: the tenant's two confidence
 * bars (marketflow-api marketingos/inbox_settings.go) offered as three presets. Null keeps the
 * server's default (0.55 to tag, 0.7 to answer). The server checks the bounds again.
 */
export type ReplySensitivity = "careful" | "standard" | "more" | "custom";

export interface Bars {
  intent: number | null;
  reply: number | null;
}

export const SENSITIVITY: Record<Exclude<ReplySensitivity, "custom">, Bars> = {
  careful: { intent: 0.7, reply: 0.85 },
  standard: { intent: null, reply: null },
  more: { intent: 0.5, reply: 0.6 },
};

/** The preset that matches the saved bars, or custom when they were set some other way. */
export function sensitivityOf(intent?: number | null, reply?: number | null): ReplySensitivity {
  for (const [k, v] of Object.entries(SENSITIVITY)) {
    if ((intent ?? null) === v.intent && (reply ?? null) === v.reply) return k as ReplySensitivity;
  }
  return "custom";
}
