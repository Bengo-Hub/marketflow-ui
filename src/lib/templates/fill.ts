/**
 * A template prompt carries ${field} slots (marketflow-ai library). They are filled before the
 * prompt reaches the manager: a prompt is never sent with a raw slot in it, here or on the server.
 */

const slotRe = /\$\{([a-z_]+)\}/g;

/** The fields a template asks for, in the order they first appear. */
export function templateFields(text: string): string[] {
  const out: string[] = [];
  for (const m of text.matchAll(slotRe)) if (!out.includes(m[1])) out.push(m[1]);
  return out;
}

/** The template with every slot replaced; a slot with no value stays as it is. */
export function fillTemplate(text: string, values: Record<string, string>): string {
  return text.replace(slotRe, (whole, name: string) => {
    const v = (values[name] ?? "").trim();
    return v ? v : whole;
  });
}

/** Slots still in a message. A message with any is not sent. */
export function unfilledFields(text: string): string[] {
  return templateFields(text);
}

/** "offering" reads "Offering", "competitors" reads "Competitors". */
export function fieldLabel(name: string): string {
  const s = name.replace(/_/g, " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Template slots that hold an amount of money; they take the money field and carry the currency. */
export const MONEY_FIELDS = ["budget", "price", "amount"] as const;

export function isMoneyField(name: string): boolean {
  return (MONEY_FIELDS as readonly string[]).includes(name);
}
