"use client";

import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CapsuleTabs } from "@/components/ui-kit";
import {
  CLASS_HINT,
  POLICY_CLASSES,
  addClass,
  addTarget,
  classOrder,
  moveTarget,
  parsePolicy,
  removeClass,
  removeTarget,
  serializePolicy,
  updateTarget,
  type RoutingPolicy,
} from "@/lib/providers/routing-policy";

type View = "classes" | "json";

// Suggestions only; any provider saved on an AI card can be named.
const PROVIDERS = ["groq", "anthropic", "openai", "openrouter", "gemini", "cerebras", "ollama"];
const MODEL_ALIASES = ["@fallback", "@router", "@premium"];

/**
 * Editor for ai_routing/policy. "By class" shows each class as its fallback list of
 * provider, model and timeout; "Raw JSON" is the stored text. Both write the same JSON, and
 * keys the class view does not show (decide, prices, effort) are kept.
 */
export function RoutingPolicyEditor({
  id,
  value,
  onChange,
  placeholder,
  hintId,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hintId?: string;
}) {
  const parsed = useMemo(() => parsePolicy(value), [value]);
  const [view, setView] = useState<View>("classes");
  const shown: View = parsed.ok ? view : "json";
  const errorId = `${id}-error`;

  return (
    <div className="space-y-3">
      <CapsuleTabs<View>
        label="Policy view"
        value={shown}
        onChange={setView}
        options={[
          { value: "classes", label: "By class" },
          { value: "json", label: "Raw JSON" },
        ]}
      />

      {shown === "json" ? (
        <div className="space-y-1.5">
          <Textarea
            id={id}
            value={value}
            placeholder={placeholder}
            onChange={(e) => onChange(e.target.value)}
            rows={16}
            spellCheck={false}
            aria-invalid={!parsed.ok || undefined}
            aria-describedby={[!parsed.ok ? errorId : "", hintId ?? ""].filter(Boolean).join(" ") || undefined}
            className="min-h-64 field-sizing-fixed resize-y font-mono text-xs leading-relaxed md:text-xs"
          />
          {!parsed.ok && (
            <p id={errorId} role="alert" className="text-xs text-destructive">
              Not valid JSON yet: {parsed.error}. Fix it here; the class view opens again once it parses.
            </p>
          )}
        </div>
      ) : (
        parsed.ok && <ClassView id={id} policy={parsed.policy} onChange={(p) => onChange(serializePolicy(p))} />
      )}
    </div>
  );
}

function ClassView({ id, policy, onChange }: { id: string; policy: RoutingPolicy; onChange: (p: RoutingPolicy) => void }) {
  const classes = classOrder(policy);
  const missing = POLICY_CLASSES.filter((c) => !classes.includes(c));
  const extraKeys = Object.keys(policy).filter((k) => k !== "classes");

  return (
    <div className="space-y-3">
      {classes.length === 0 && (
        <p className="rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          No class is overridden, so marketflow-ai uses its built-in routing. Add a class to change its fallback order.
        </p>
      )}

      {classes.map((cls) => {
        const targets = policy.classes?.[cls] ?? [];
        const headingId = `${id}-${cls}`;
        return (
          <section key={cls} aria-labelledby={headingId} className="rounded-xl border border-border bg-background/50 p-3 sm:p-4">
            <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h4 id={headingId} className="font-mono text-sm font-semibold text-foreground">
                  {cls}
                </h4>
                {CLASS_HINT[cls] && <p className="text-xs text-muted-foreground">{CLASS_HINT[cls]}</p>}
              </div>
              <Button type="button" size="sm" variant="ghost" onClick={() => onChange(removeClass(policy, cls))}>
                <Trash2 /> Use default
              </Button>
            </div>

            {targets.length > 0 && (
              <div
                aria-hidden
                className="mb-1 hidden gap-2 px-1 text-xs font-medium text-muted-foreground sm:grid sm:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1.4fr)_6rem_7.5rem]"
              >
                <span />
                <span>Provider</span>
                <span>Model</span>
                <span>Timeout (s)</span>
                <span />
              </div>
            )}
            <ol className="space-y-2">
              {targets.map((t, i) => {
                const rowId = `${id}-${cls}-${i}`;
                const where = `${cls} target ${i + 1}`;
                return (
                  <li
                    key={i}
                    className="grid grid-cols-[1.5rem_minmax(0,1fr)] items-center gap-2 sm:grid-cols-[1.5rem_minmax(0,1fr)_minmax(0,1.4fr)_6rem_7.5rem]"
                  >
                    <span className="row-span-4 self-start pt-2 text-center text-xs font-semibold text-muted-foreground tabular sm:row-span-1 sm:self-center sm:pt-0">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <label htmlFor={`${rowId}-p`} className="mb-1 block text-xs font-medium text-muted-foreground sm:sr-only">
                        Provider ({where})
                      </label>
                      <Input
                        id={`${rowId}-p`}
                        list={`${id}-providers`}
                        value={String(t.provider ?? "")}
                        placeholder="groq"
                        autoComplete="off"
                        onChange={(e) => onChange(updateTarget(policy, cls, i, "provider", e.target.value))}
                      />
                    </div>
                    <div className="col-start-2 min-w-0 sm:col-start-auto">
                      <label htmlFor={`${rowId}-m`} className="mb-1 block text-xs font-medium text-muted-foreground sm:sr-only">
                        Model ({where})
                      </label>
                      <Input
                        id={`${rowId}-m`}
                        list={`${id}-models`}
                        value={String(t.model ?? "")}
                        placeholder="Main model"
                        autoComplete="off"
                        className="font-mono text-xs md:text-xs"
                        onChange={(e) => onChange(updateTarget(policy, cls, i, "model", e.target.value))}
                      />
                    </div>
                    <div className="col-start-2 min-w-0 sm:col-start-auto">
                      <label htmlFor={`${rowId}-t`} className="mb-1 block text-xs font-medium text-muted-foreground sm:sr-only">
                        Timeout in seconds ({where})
                      </label>
                      <Input
                        id={`${rowId}-t`}
                        type="number"
                        min={1}
                        inputMode="numeric"
                        value={t.timeout_seconds ?? ""}
                        placeholder="Default"
                        onChange={(e) => onChange(updateTarget(policy, cls, i, "timeout_seconds", e.target.value))}
                      />
                    </div>
                    <div className="col-start-2 flex items-center gap-1 sm:col-start-auto sm:justify-end">
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Move ${where} up`}
                        disabled={i === 0}
                        onClick={() => onChange(moveTarget(policy, cls, i, -1))}
                      >
                        <ArrowUp />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Move ${where} down`}
                        disabled={i === targets.length - 1}
                        onClick={() => onChange(moveTarget(policy, cls, i, 1))}
                      >
                        <ArrowDown />
                      </Button>
                      <Button
                        type="button"
                        size="icon-sm"
                        variant="ghost"
                        aria-label={`Remove ${where}`}
                        onClick={() => onChange(removeTarget(policy, cls, i))}
                      >
                        <Trash2 />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ol>
            <Button type="button" size="sm" variant="outline" className="mt-3" onClick={() => onChange(addTarget(policy, cls))}>
              <Plus /> Add fallback
            </Button>
          </section>
        );
      })}

      {missing.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">Override a class:</span>
          {missing.map((c) => (
            <Button key={c} type="button" size="sm" variant="outline" onClick={() => onChange(addClass(policy, c))}>
              <Plus /> <span className="font-mono">{c}</span>
            </Button>
          ))}
        </div>
      )}

      {extraKeys.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Also set in this policy: {extraKeys.join(", ")}. Edit those in Raw JSON; the class view keeps them as they are.
        </p>
      )}

      <datalist id={`${id}-providers`}>
        {PROVIDERS.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>
      <datalist id={`${id}-models`}>
        {MODEL_ALIASES.map((m) => (
          <option key={m} value={m} />
        ))}
      </datalist>
    </div>
  );
}
