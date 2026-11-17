import { Lightbulb } from "lucide-react";

/**
 * The assistant's marketing-law notes on its own answer (urgency, scarcity or a "was" price with
 * no fact behind it). Advice for the owner: the answer was sent or shown as written.
 */
export function ReviewNotes({ notes }: { notes?: string[] | null }) {
  const list = (notes ?? []).filter((n) => typeof n === "string" && n.trim() !== "").slice(0, 10);
  if (list.length === 0) return null;
  return (
    <div className="mt-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:border-amber-500/40 dark:bg-amber-950/40 dark:text-amber-100">
      <p className="flex items-center gap-1.5 font-medium">
        <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
        Worth a look before you reuse this
      </p>
      <ul className="mt-1 list-disc space-y-0.5 pl-5">
        {list.map((n, i) => (
          <li key={i}>{n}</li>
        ))}
      </ul>
    </div>
  );
}
